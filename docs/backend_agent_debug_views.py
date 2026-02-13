"""
Views para diagnóstico e controle do Agente AI
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
import logging

logger = logging.getLogger(__name__)


class AgentDebugView(APIView):
    """
    View para debug do agente e handover.
    
    GET /api/v1/debug/agent-status/?conversation_id=<id>
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        conversation_id = request.query_params.get('conversation_id')
        account_id = request.query_params.get('account_id')
        
        debug_info = {
            'timestamp': timezone.now().isoformat(),
            'checks': {}
        }
        
        # 1. Verificar conversa
        if conversation_id:
            try:
                from apps.conversations.models import Conversation
                conversation = Conversation.objects.select_related(
                    'account', 'account__default_agent'
                ).get(id=conversation_id)
                
                debug_info['conversation'] = {
                    'id': str(conversation.id),
                    'status': conversation.status,
                }
                
                # Verificar conta
                account = conversation.account
                debug_info['account'] = {
                    'id': str(account.id),
                    'phone_number': account.phone_number,
                    'has_default_agent': account.default_agent_id is not None,
                }
                
                # Verificar agente
                agent = account.default_agent
                if agent:
                    debug_info['agent'] = {
                        'id': str(agent.id),
                        'name': agent.name,
                        'is_active': agent.is_active,
                        'model': agent.model,
                    }
                    debug_info['checks']['agent_active'] = agent.is_active
                else:
                    debug_info['checks']['agent_active'] = False
                    debug_info['checks']['agent_error'] = 'No default agent'
                
                # Verificar handover
                handover = getattr(conversation, 'handover', None)
                if handover:
                    debug_info['handover'] = {
                        'id': str(handover.id),
                        'status': handover.status,
                        'assigned_to': str(handover.assigned_to.id) if handover.assigned_to else None,
                    }
                    debug_info['checks']['handover_bot_mode'] = handover.status == 'bot'
                else:
                    debug_info['handover'] = None
                    debug_info['checks']['handover_bot_mode'] = True  # Sem handover = modo bot
                    
            except Exception as e:
                debug_info['error'] = str(e)
        
        # 2. Verificar conta diretamente
        elif account_id:
            try:
                from apps.whatsapp.models import WhatsAppAccount
                account = WhatsAppAccount.objects.select_related('default_agent').get(id=account_id)
                
                debug_info['account'] = {
                    'id': str(account.id),
                    'phone_number': account.phone_number,
                    'has_default_agent': account.default_agent_id is not None,
                }
                
                agent = account.default_agent
                if agent:
                    debug_info['agent'] = {
                        'id': str(agent.id),
                        'name': agent.name,
                        'is_active': agent.is_active,
                    }
                    debug_info['checks']['agent_active'] = agent.is_active
                else:
                    debug_info['checks']['agent_active'] = False
                    
            except Exception as e:
                debug_info['error'] = str(e)
        
        # 3. Determinar se agente responderia
        agent_would_respond = all([
            debug_info['checks'].get('agent_active', False),
            debug_info['checks'].get('handover_bot_mode', True)
        ])
        
        debug_info['agent_would_respond'] = agent_would_respond
        debug_info['recommendation'] = (
            'Agente ESTÁ respondendo' if agent_would_respond 
            else 'Agente NÃO está respondendo (correto)'
        )
        
        return Response(debug_info)


class AgentForceDeactivateView(APIView):
    """
    View para forçar desativação imediata do agente.
    
    POST /api/v1/agents/{id}/force-deactivate/
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, agent_id):
        try:
            from apps.agents.models import Agent
            agent = Agent.objects.get(id=agent_id)
            
            # Desativar agente
            agent.is_active = False
            agent.save()
            
            # Invalidar cache se existir
            try:
                from django.core.cache import cache
                cache.delete(f"agent_config:{agent_id}")
                
                # Invalidar cache de todas as contas usando este agente
                from apps.whatsapp.models import WhatsAppAccount
                for account in WhatsAppAccount.objects.filter(default_agent=agent):
                    cache.delete(f"account_agent:{account.id}")
                    logger.info(f"Invalidated cache for account {account.id}")
            except Exception as cache_error:
                logger.warning(f"Cache invalidation error: {cache_error}")
            
            # Transferir todas as conversas ativas para modo humano
            from apps.conversations.models import Conversation
            from apps.handover.models import ConversationHandover
            
            active_conversations = Conversation.objects.filter(
                account__default_agent=agent,
                status='active'
            )
            
            transferred_count = 0
            for conversation in active_conversations:
                handover, _ = ConversationHandover.objects.get_or_create(
                    conversation=conversation,
                    defaults={'status': 'bot'}
                )
                if handover.status == 'bot':
                    handover.transfer_to_human(
                        user=request.user,
                        reason=f"Agente {agent.name} desativado manualmente"
                    )
                    transferred_count += 1
            
            return Response({
                'success': True,
                'message': f'Agente {agent.name} desativado',
                'details': {
                    'agent_id': str(agent_id),
                    'is_active': agent.is_active,
                    'conversations_transferred': transferred_count,
                    'cache_invalidated': True
                }
            })
            
        except Exception as e:
            logger.error(f"Error deactivating agent: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)


class ConversationForceHandoverView(APIView):
    """
    View para forçar transferência de uma conversa.
    
    POST /api/v1/conversations/{id}/force-handover/
    Body: {"target": "bot" | "human", "reason": "..."}
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, conversation_id):
        target = request.data.get('target')
        reason = request.data.get('reason', 'Manual override')
        
        if target not in ['bot', 'human']:
            return Response({
                'error': 'Target must be "bot" or "human"'
            }, status=400)
        
        try:
            from apps.conversations.models import Conversation
            from apps.handover.models import ConversationHandover
            
            conversation = Conversation.objects.get(id=conversation_id)
            handover, _ = ConversationHandover.objects.get_or_create(
                conversation=conversation,
                defaults={'status': 'bot'}
            )
            
            if target == 'bot':
                handover.transfer_to_bot(user=request.user, reason=reason)
            else:
                handover.transfer_to_human(user=request.user, reason=reason)
            
            return Response({
                'success': True,
                'conversation_id': str(conversation_id),
                'new_status': handover.status,
                'reason': reason
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)
