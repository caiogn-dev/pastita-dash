"""
Backend - Instagram API Endpoints

Estes são os endpoints que o frontend espera encontrar.
Se não existirem no backend, copiar este arquivo.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class InstagramAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet para contas do Instagram.
    """
    queryset = InstagramAccount.objects.all()
    serializer_class = InstagramAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por loja se usuário não é super
        if not self.request.user.is_superuser:
            queryset = queryset.filter(store__members=self.request.user)
        return queryset
    
    @action(detail=True, methods=['post'])
    def refresh_token(self, request, pk=None):
        """Atualiza token da conta."""
        account = self.get_object()
        # Implementar lógica de refresh
        return Response({'status': 'token refreshed'})
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Sincroniza dados da conta."""
        account = self.get_object()
        # Implementar lógica de sync
        return Response({'status': 'synced'})
    
    @action(detail=True, methods=['post'])
    def sync_profile(self, request, pk=None):
        """Sincroniza perfil do Instagram."""
        account = self.get_object()
        # Buscar dados do perfil na API do Instagram
        return Response({'synced': True})
    
    @action(detail=True, methods=['post'])
    def sync_conversations(self, request, pk=None):
        """Sincroniza conversas do Instagram."""
        account = self.get_object()
        # Buscar conversas na API do Instagram
        conversations = InstagramConversation.objects.filter(account=account)
        return Response({
            'synced': True,
            'count': conversations.count()
        })
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Retorna estatísticas da conta."""
        account = self.get_object()
        stats = {
            'total_conversations': InstagramConversation.objects.filter(account=account).count(),
            'active_conversations': InstagramConversation.objects.filter(
                account=account, status='active'
            ).count(),
            'total_messages': InstagramMessage.objects.filter(
                conversation__account=account
            ).count(),
            'unread_messages': InstagramMessage.objects.filter(
                conversation__account=account,
                is_read=False
            ).count(),
        }
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def insights(self, request, pk=None):
        """Retorna insights da conta."""
        account = self.get_object()
        since = request.query_params.get('since')
        until = request.query_params.get('until')
        # Buscar insights na API do Instagram
        return Response({})


class InstagramConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para conversas do Instagram.
    """
    queryset = InstagramConversation.objects.all()
    serializer_class = InstagramConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por conta
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        # Filtrar por loja
        if not self.request.user.is_superuser:
            queryset = queryset.filter(account__store__members=self.request.user)
        
        return queryset.order_by('-updated_at')
    
    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        """Marca conversa como vista."""
        conversation = self.get_object()
        InstagramMessage.objects.filter(
            conversation=conversation,
            is_read=False
        ).update(is_read=True)
        return Response({'status': 'marked as seen'})
    
    @action(detail=True, methods=['post'])
    def typing(self, request, pk=None):
        """Envia indicador de digitação."""
        conversation = self.get_object()
        # Enviar para API do Instagram
        return Response({'status': 'typing sent'})


class InstagramMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para mensagens do Instagram.
    """
    queryset = InstagramMessage.objects.all()
    serializer_class = InstagramMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por conversa
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        
        return queryset.order_by('created_at')


class InstagramDMView(APIView):
    """
    API View para ações de DM (Direct Message).
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, action):
        if action == 'send-message':
            return self.send_message(request)
        elif action == 'typing':
            return self.send_typing(request)
        elif action == 'mark-seen':
            return self.mark_seen(request)
        return Response({'error': 'Invalid action'}, status=400)
    
    def send_message(self, request):
        """Envia mensagem para usuário do Instagram."""
        account_id = request.data.get('account_id')
        recipient_id = request.data.get('recipient_id')
        text = request.data.get('text')
        message_type = request.data.get('message_type', 'text')
        
        account = get_object_or_404(InstagramAccount, id=account_id)
        
        # Enviar mensagem via API do Instagram
        # Implementar integração com Instagram Graph API
        
        # Criar registro da mensagem
        message = InstagramMessage.objects.create(
            conversation_id=request.data.get('conversation_id'),
            sender_id=account.instagram_id,
            recipient_id=recipient_id,
            content=text,
            message_type=message_type,
            direction='outbound',
            status='sent'
        )
        
        return Response({
            'id': str(message.id),
            'content': text,
            'status': 'sent',
            'created_at': message.created_at
        })
    
    def send_typing(self, request):
        """Envia indicador de digitação."""
        account_id = request.data.get('account_id')
        recipient_id = request.data.get('recipient_id')
        
        # Enviar para API do Instagram
        return Response({'status': 'typing indicator sent'})
    
    def mark_seen(self, request):
        """Marca mensagens como vistas."""
        account_id = request.data.get('account_id')
        sender_id = request.data.get('sender_id')
        
        # Enviar para API do Instagram
        InstagramMessage.objects.filter(
            conversation__account_id=account_id,
            sender_id=sender_id,
            is_read=False
        ).update(is_read=True)
        
        return Response({'status': 'marked as seen'})


# URLs para adicionar em urls.py:
"""
router = DefaultRouter()
router.register(r'instagram/accounts', InstagramAccountViewSet)
router.register(r'instagram/conversations', InstagramConversationViewSet)
router.register(r'instagram/messages', InstagramMessageViewSet)

urlpatterns = [
    ...
    path('api/v1/', include(router.urls)),
    path('api/v1/instagram/send-message/', InstagramDMView.as_view(), name='instagram-send-message'),
    path('api/v1/instagram/typing/', InstagramDMView.as_view(), name='instagram-typing'),
    path('api/v1/instagram/mark-seen/', InstagramDMView.as_view(), name='instagram-mark-seen'),
]
"""
