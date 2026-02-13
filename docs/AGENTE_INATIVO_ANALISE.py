"""
ANÁLISE: Agente respondendo mesmo inativo/pausado

Problema: O agente AI continua respondendo mensagens mesmo quando:
- Está marcado como "inativo" no dashboard
- Está "pausado" ou em modo "human"

Possíveis causas e soluções:
"""

# ============================================
# CAUSA 1: Verificação de status do agente no webhook
# ============================================

# Em apps/whatsapp/webhooks/views.py ou similar:

# PROBLEMA: Não está verificando se o agente está ativo
class WhatsAppWebhookView(APIView):
    def post(self, request):
        # ... código de processamento ...
        
        # ❌ ERRADO: Sempre processa com AI
        if account.default_agent:
            process_with_ai(message, account.default_agent)
        
        # ✅ CERTO: Verificar se agente está ativo E se handover está em modo bot
        if account.default_agent and account.default_agent.is_active:
            # Verificar também o handover status
            handover = conversation.handover if hasattr(conversation, 'handover') else None
            if not handover or handover.status == 'bot':
                process_with_ai(message, account.default_agent)
            else:
                # Handover está em modo humano, não processar com AI
                logger.info(f"Conversa {conversation.id} em modo humano, ignorando AI")
        else:
            logger.info(f"Agente inativo ou não configurado para conta {account.id}")


# ============================================
# CAUSA 2: Celery task não verifica status atual
# ============================================

# Em apps/whatsapp/tasks/__init__.py ou similar:

# ❌ ERRADO: Task processa sem verificar status atual
@app.task
def process_whatsapp_message(message_id):
    message = WhatsAppMessage.objects.get(id=message_id)
    account = message.account
    
    # Sempre processa com AI
    if account.default_agent:
        response = account.default_agent.process_message(message.content)
        send_whatsapp_message(account, message.sender, response)

# ✅ CERTO: Verificar status antes de processar
@app.task
def process_whatsapp_message(message_id):
    message = WhatsAppMessage.objects.get(id=message_id)
    account = message.account
    conversation = message.conversation
    
    # Verificar se agente está ativo
    if not account.default_agent or not account.default_agent.is_active:
        logger.info(f"Agente inativo, mensagem {message_id} não processada")
        return
    
    # Verificar handover status
    handover_status = 'bot'
    if hasattr(conversation, 'handover'):
        handover_status = conversation.handover.status
    
    if handover_status != 'bot':
        logger.info(f"Conversa em modo {handover_status}, mensagem {message_id} não processada por AI")
        return
    
    # Processar com AI
    response = account.default_agent.process_message(message.content)
    send_whatsapp_message(account, message.sender, response)


# ============================================
# CAUSA 3: Cache de configuração do agente
# ============================================

# Se o sistema usa cache (Redis), pode estar usando configuração antiga

# Solução: Invalidar cache quando agente é desativado
def deactivate_agent(agent_id):
    agent = Agent.objects.get(id=agent_id)
    agent.is_active = False
    agent.save()
    
    # Invalidar cache
    cache.delete(f"agent_config:{agent_id}")
    
    # Invalidar cache de contas que usam este agente
    for account in WhatsAppAccount.objects.filter(default_agent=agent):
        cache.delete(f"account_agent:{account.id}")


# ============================================
# CAUSA 4: Conversas existentes não atualizam handover
# ============================================

# Quando desativa o agente, conversas ativas podem continuar sem handover

# Solução: Criar signal para garantir handover em todas as conversas
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Conversation)
def ensure_handover_exists(sender, instance, created, **kwargs):
    """Garante que toda conversa tem um registro de handover."""
    if created:
        ConversationHandover.objects.get_or_create(
            conversation=instance,
            defaults={'status': 'bot'}  # Começa em modo bot
        )


# ============================================
# CAUSA 5: Verificação no momento errado do fluxo
# ============================================

# O webhook pode estar processando a mensagem ANTES de verificar o agente

# Fluxo correto:
# 1. Receber webhook
# 2. Salvar mensagem
# 3. Verificar agente está ativo
# 4. Verificar handover status
# 5. Se tudo OK, processar com AI
# 6. Se não, apenas notificar/ignorar

# Código corrigido:
class WhatsAppWebhookView(APIView):
    def post(self, request):
        # 1. Parse webhook
        data = request.data
        
        # 2. Identificar conta
        account = self.get_account(data['phone_number_id'])
        if not account:
            return Response(status=404)
        
        # 3. Salvar mensagem
        message = self.save_message(data, account)
        conversation = message.conversation
        
        # 4. VERIFICAÇÃO: Agente ativo?
        agent = account.default_agent
        if not agent or not agent.is_active:
            logger.info(f"Agente inativo para conta {account.id}")
            return Response(status=200)  # Retorna 200 para não reenviar webhook
        
        # 5. VERIFICAÇÃO: Modo bot?
        handover = getattr(conversation, 'handover', None)
        if handover and handover.status != 'bot':
            logger.info(f"Conversa {conversation.id} em modo {handover.status}")
            
            # Notificar operadores (opcional)
            notify_new_message_for_human(conversation, message)
            return Response(status=200)
        
        # 6. Processar com AI
        process_with_ai.delay(message.id, agent.id)
        
        return Response(status=200)


# ============================================
# DEBUG: Logs para identificar o problema
# ============================================

# Adicionar logs detalhados para rastrear o fluxo:

import logging
logger = logging.getLogger(__name__)

def process_message_debug(message_id):
    """Versão com logs detalhados para debug."""
    message = WhatsAppMessage.objects.select_related(
        'account', 'account__default_agent', 'conversation__handover'
    ).get(id=message_id)
    
    account = message.account
    agent = account.default_agent
    conversation = message.conversation
    handover = getattr(conversation, 'handover', None)
    
    logger.info(f"=== PROCESSING MESSAGE {message_id} ===")
    logger.info(f"Account: {account.id} ({account.phone_number})")
    logger.info(f"Agent: {agent.id if agent else 'None'} - Active: {agent.is_active if agent else 'N/A'}")
    logger.info(f"Conversation: {conversation.id}")
    logger.info(f"Handover: {handover.status if handover else 'None'}")
    
    # Verificações
    if not agent:
        logger.warning("❌ No agent configured")
        return False
    
    if not agent.is_active:
        logger.warning("❌ Agent is inactive")
        return False
    
    if handover and handover.status != 'bot':
        logger.warning(f"❌ Handover status is {handover.status}, not 'bot'")
        return False
    
    logger.info("✅ All checks passed, processing with AI")
    return True


# ============================================
# CHECKLIST PARA VERIFICAR
# ============================================

"""
CHECKLIST - Agente respondendo indevidamente:

1. [ ] Verificar se o modelo Agent tem campo is_active
   - Se não tiver, adicionar: is_active = models.BooleanField(default=True)

2. [ ] Verificar se o webhook checa agent.is_active
   - Buscar em apps/whatsapp/webhooks/views.py
   - Adicionar verificação se não existir

3. [ ] Verificar se o Celery task checa agent.is_active
   - Buscar em apps/whatsapp/tasks/
   - Adicionar verificação se não existir

4. [ ] Verificar se há cache do agente
   - Se sim, garantir que cache é invalidado ao desativar

5. [ ] Verificar se o handover é verificado
   - Se não existir handover, criar
   - Se existir, verificar status == 'bot'

6. [ ] Verificar se há processamento síncrono E assíncrono
   - Pode estar processando em dois lugares
   - Garantir que só processa uma vez

7. [ ] Adicionar logs para rastrear o fluxo
   - Usar o código de debug acima

8. [ ] Testar:
   - Desativar agente
   - Enviar mensagem
   - Verificar logs se foi ignorada
"""
