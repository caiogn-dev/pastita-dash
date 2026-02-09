"""
FIX: Agente respondendo mesmo quando inativo

Este arquivo contém as correções necessárias para o backend.
Copiar as funções relevantes para os arquivos correspondentes.
"""

# ============================================
# FIX 1: Webhook WhatsApp - Verificar agente ativo
# ============================================
# Arquivo: /app/apps/whatsapp/webhooks/views.py

"""
Adicionar no início do método que processa mensagens:

class WhatsAppWebhookView(APIView):
    def process_event(self, data, account):
        # ... código existente ...
        
        # ✅ FIX: Verificar se agente está ativo antes de processar
        agent = account.default_agent
        if not agent:
            logger.info(f"Conta {account.id} não tem agente configurado")
            return Response(status=200)
        
        if not agent.is_active:
            logger.info(f"Agente {agent.id} está inativo, ignorando mensagem")
            return Response(status=200)
        
        # Verificar também se handover está em modo bot (se existir)
        conversation = self.get_conversation(data, account)
        if hasattr(conversation, 'handover'):
            if conversation.handover.status != 'bot':
                logger.info(f"Conversa {conversation.id} em modo {conversation.handover.status}, ignorando AI")
                return Response(status=200)
        
        # Só então processar com AI
        self.process_with_ai(data, account, conversation)
        
        return Response(status=200)
"""


# ============================================
# FIX 2: Task Celery - Verificar agente ativo
# ============================================
# Arquivo: /app/apps/whatsapp/tasks/__init__.py

"""
Modificar a task que processa mensagens:

@app.task
def process_whatsapp_message(message_id):
    from apps.whatsapp.models import Message
    from apps.agents.models import Agent
    
    try:
        message = Message.objects.select_related(
            'account', 'account__default_agent', 'conversation'
        ).get(id=message_id)
        
        account = message.account
        agent = account.default_agent
        conversation = message.conversation
        
        # ✅ FIX 1: Verificar se agente existe e está ativo
        if not agent:
            logger.info(f"Mensagem {message_id}: Sem agente configurado")
            return
        
        if not agent.is_active:
            logger.info(f"Mensagem {message_id}: Agente {agent.id} inativo")
            return
        
        # ✅ FIX 2: Verificar handover status
        handover_status = 'bot'
        if hasattr(conversation, 'handover'):
            handover_status = conversation.handover.status
        
        if handover_status != 'bot':
            logger.info(f"Mensagem {message_id}: Handover em modo {handover_status}")
            return
        
        # ✅ FIX 3: Verificar se não é mensagem do próprio bot
        if message.direction == 'outbound':
            logger.info(f"Mensagem {message_id}: Ignorando mensagem do bot")
            return
        
        # Só então processar
        response = agent.process_message(message.content)
        send_whatsapp_message(account, message.sender, response)
        
    except Exception as e:
        logger.error(f"Erro processando mensagem {message_id}: {e}")
        raise
"""


# ============================================
# FIX 3: Invalidar cache ao desativar agente
# ============================================
# Arquivo: /app/apps/agents/views.py ou signals.py

"""
Adicionar signal para invalidar cache:

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.cache import cache
from .models import Agent

@receiver(pre_save, sender=Agent)
def invalidate_agent_cache(sender, instance, **kwargs):
    '''Invalida cache quando agente é modificado'''
    if instance.pk:  # Só para updates, não creates
        try:
            old_agent = Agent.objects.get(pk=instance.pk)
            # Se status mudou de ativo para inativo
            if old_agent.is_active and not instance.is_active:
                logger.info(f"Agente {instance.id} desativado, invalidando cache")
                
                # Invalidar cache do agente
                cache.delete(f"agent_config:{instance.id}")
                cache.delete(f"agent:{instance.id}")
                
                # Invalidar cache de todas as contas usando este agente
                from apps.whatsapp.models import WhatsAppAccount
                for account in WhatsAppAccount.objects.filter(default_agent=instance):
                    cache.delete(f"account_agent:{account.id}")
                    cache.delete(f"account_config:{account.id}")
                    
                logger.info(f"Cache invalidado para agente {instance.id}")
        except Agent.DoesNotExist:
            pass
"""


# ============================================
# FIX 4: Decorator para verificar agente ativo
# ============================================
# Arquivo: /app/apps/agents/decorators.py

"""
Criar decorator reutilizável:

import functools
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def require_active_agent(func):
    '''
    Decorator que verifica se o agente está ativo antes de executar.
    Usar em métodos que processam mensagens com AI.
    '''
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Extrair account/agent dos argumentos
        account = kwargs.get('account') or (args[0] if args else None)
        
        if not account:
            logger.warning("require_active_agent: Account não encontrado")
            return None
        
        agent = getattr(account, 'default_agent', None)
        
        if not agent:
            logger.info(f"Conta {account.id}: Sem agente configurado")
            return None
        
        # Verificar cache primeiro
        cache_key = f"agent_active:{agent.id}"
        is_active = cache.get(cache_key)
        
        if is_active is None:
            # Não está em cache, buscar do banco
            is_active = agent.is_active
            # Guardar em cache por 5 minutos
            cache.set(cache_key, is_active, 300)
        
        if not is_active:
            logger.info(f"Agente {agent.id}: Inativo (cache ou banco)")
            return None
        
        # Agente está ativo, executar função
        return func(*args, **kwargs)
    
    return wrapper


# Uso:
# @require_active_agent
# def process_message_with_ai(message, account):
#     ...
"""


# ============================================
# FIX 5: Management command para verificar status
# ============================================
# Arquivo: /app/apps/agents/management/commands/check_agent_status.py

"""
Criar comando: python manage.py check_agent_status

from django.core.management.base import BaseCommand
from apps.agents.models import Agent
from apps.whatsapp.models import WhatsAppAccount


class Command(BaseCommand):
    help = 'Verifica status dos agentes e contas'

    def handle(self, *args, **options):
        self.stdout.write("=== Status dos Agentes ===")
        
        agents = Agent.objects.all()
        for agent in agents:
            status = "✅ Ativo" if agent.is_active else "❌ Inativo"
            self.stdout.write(f"{agent.name}: {status}")
            
            # Contas usando este agente
            accounts = WhatsAppAccount.objects.filter(default_agent=agent)
            for account in accounts:
                self.stdout.write(f"  └── {account.phone_number}")
        
        self.stdout.write("\n=== Contas sem agente ===")
        accounts_no_agent = WhatsAppAccount.objects.filter(default_agent__isnull=True)
        for account in accounts_no_agent:
            self.stdout.write(f"{account.phone_number}: Sem agente")
"""


# ============================================
# CHECKLIST DE IMPLEMENTAÇÃO
# ============================================

"""
CHECKLIST:

1. [ ] Copiar FIX 1 para webhook (views.py)
   - Localizar função que processa mensagens
   - Adicionar verificações no início

2. [ ] Copiar FIX 2 para tasks (__init__.py)
   - Localizar task de processamento
   - Adicionar verificações

3. [ ] Copiar FIX 3 (signals.py)
   - Criar arquivo signals.py se não existir
   - Adicionar signal pre_save
   - Importar signals em apps.py ready()

4. [ ] Copiar FIX 4 (decorators.py)
   - Criar arquivo decorators.py
   - Usar decorator nas funções relevantes

5. [ ] Copiar FIX 5 (management command)
   - Criar estrutura de diretórios
   - Criar comando

6. [ ] Testar
   - Desativar agente no admin
   - Enviar mensagem
   - Verificar logs (não deve processar)

7. [ ] Ativar agente novamente
   - Enviar mensagem
   - Verificar se processa normalmente
"""
