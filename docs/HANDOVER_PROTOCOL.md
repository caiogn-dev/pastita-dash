# Handover Protocol - Implementação Completa

## Status Atual
- ✅ Visual indicador (Bot/Humano) - Já existe
- ❌ Botão de transferência - Não funcional
- ❌ Backend endpoints - Não existem
- ❌ WebSocket events - Não implementado

## Fluxo Desejado

```
Cliente manda mensagem
       ↓
   [Bot ativo] ←→ [Humano ativo]
       ↓                ↓
  Resposta AI      Operador responde
       ↓                ↓
  Se não resolver   Pode transferir
       ↓                ↓
  Oferece           para Bot
  transferência
       ↓
  Cliente aceita?
       ↓
  [Transfere para humano]
```

## Backend - Endpoints Necessários

### 1. Transferir para Bot
```python
POST /api/v1/conversations/<id>/handover/bot/

Response:
{
  "success": true,
  "handover_status": "bot",
  "message": "Conversa transferida para o bot"
}
```

### 2. Transferir para Humano
```python
POST /api/v1/conversations/<id>/handover/human/

Response:
{
  "success": true,
  "handover_status": "human",
  "assigned_to": "user_id",
  "message": "Conversa transferida para atendimento humano"
}
```

### 3. Obter Status
```python
GET /api/v1/conversations/<id>/handover/status/

Response:
{
  "handover_status": "bot" | "human" | "pending",
  "assigned_to": "user_id" | null,
  "assigned_to_name": "Nome do operador" | null,
  "last_transfer_at": "2024-01-01T12:00:00Z"
}
```

## Frontend - Alterações

### 1. Atualizar Conversation Type
```typescript
interface Conversation {
  // ... existing fields
  handover_status: 'bot' | 'human' | 'pending';
  assigned_to?: string;
  assigned_to_name?: string;
  last_transfer_at?: string;
}
```

### 2. Criar Handover Service
```typescript
// src/services/handover.ts
export const handoverService = {
  transferToBot: (conversationId: string) => 
    api.post(`/conversations/${conversationId}/handover/bot/`),
  
  transferToHuman: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/handover/human/`),
  
  getStatus: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/handover/status/`),
};
```

### 3. Componente de Controle
```tsx
// Componente para botões de transferência
function HandoverControl({ conversation }: { conversation: Conversation }) {
  return (
    <Box display="flex" gap={1}>
      <Button
        variant={conversation.handover_status === 'bot' ? 'contained' : 'outlined'}
        onClick={() => handoverService.transferToBot(conversation.id)}
        startIcon={<SmartToyIcon />}
        color="primary"
      >
        Bot
      </Button>
      <Button
        variant={conversation.handover_status === 'human' ? 'contained' : 'outlined'}
        onClick={() => handoverService.transferToHuman(conversation.id)}
        startIcon={<PersonIcon />}
        color="success"
      >
        Humano
        {conversation.assigned_to_name && ` (${conversation.assigned_to_name})`}
      </Button>
    </Box>
  );
}
```

## WebSocket Events

### Enviar (Cliente -> Servidor)
```javascript
{
  "type": "handover.transfer",
  "conversation_id": "uuid",
  "target": "bot" | "human"
}
```

### Receber (Servidor -> Cliente)
```javascript
{
  "type": "handover.updated",
  "conversation_id": "uuid",
  "handover_status": "bot" | "human",
  "assigned_to": "user_id",
  "assigned_to_name": "Nome",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Backend - Implementação Django

### Modelo (adicionar a Conversation)
```python
class Conversation(models.Model):
    # ... existing fields
    handover_status = models.CharField(
        max_length=20,
        choices=[('bot', 'Bot'), ('human', 'Human'), ('pending', 'Pending')],
        default='bot'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_conversations'
    )
    last_transfer_at = models.DateTimeField(null=True, blank=True)
```

### View
```python
class HandoverViewSet(viewsets.ViewSet):
    @action(detail=True, methods=['post'])
    def bot(self, request, pk=None):
        conversation = self.get_object()
        conversation.handover_status = 'bot'
        conversation.assigned_to = None
        conversation.last_transfer_at = timezone.now()
        conversation.save()
        
        # Notificar via WebSocket
        notify_handover_update(conversation)
        
        return Response({'status': 'transferred_to_bot'})
    
    @action(detail=True, methods=['post'])
    def human(self, request, pk=None):
        conversation = self.get_object()
        conversation.handover_status = 'human'
        conversation.assigned_to = request.user
        conversation.last_transfer_at = timezone.now()
        conversation.save()
        
        notify_handover_update(conversation)
        
        return Response({
            'status': 'transferred_to_human',
            'assigned_to': request.user.id,
            'assigned_to_name': request.user.get_full_name()
        })
```

## Tarefas

- [ ] Criar migration para novos campos
- [ ] Criar endpoints no backend
- [ ] Criar service no frontend
- [ ] Integrar com WebSocket
- [ ] Adicionar botões nas páginas de chat
- [ ] Testar fluxo completo
