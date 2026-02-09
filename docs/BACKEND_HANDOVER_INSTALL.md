# Guia de Instalação - Handover Protocol (Backend)

## Resumo

O Handover Protocol implementa transferência de conversas entre Bot e Atendimento Humano.

## Arquivos para Copiar

Copie os seguintes arquivos para o seu projeto Django (`/app/apps/handover/`):

```
apps/handover/
├── __init__.py
├── models.py              (de docs/backend_handover_models.py)
├── serializers.py         (de docs/backend_handover_serializers.py)
├── views.py               (de docs/backend_handover_views.py)
├── urls.py                (de docs/backend_handover_urls.py)
├── consumers.py           (de docs/backend_handover_consumers.py)
└── apps.py
```

## 1. Criar Estrutura de Arquivos

```bash
mkdir -p /app/apps/handover
touch /app/apps/handover/__init__.py
```

## 2. Configurar o App

### apps/handover/apps.py
```python
from django.apps import AppConfig


class HandoverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.handover'
    verbose_name = 'Handover Protocol'
```

## 3. Adicionar ao INSTALLED_APPS

### config/settings/base.py
```python
INSTALLED_APPS = [
    # ... apps existentes
    'apps.handover',
]
```

## 4. Configurar URLs

### config/urls.py
```python
urlpatterns = [
    # ... urls existentes
    path('api/v1/', include('apps.handover.urls')),
]
```

## 5. Criar Migrações

```bash
cd /app
python manage.py makemigrations handover
python manage.py migrate
```

## 6. Configurar WebSocket (Channels)

### config/asgi.py
```python
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            # Adicione suas rotas WebSocket aqui
        )
    ),
})
```

## 7. Atualizar Conversation Model (se necessário)

Se o modelo `Conversation` não tiver relação com `Store`, ajuste o `HandoverViewSet`:

```python
# Em views.py, remover ou ajustar a verificação de permissão
# que depende de conversation.store
```

## Endpoints Disponíveis

Após a instalação, os seguintes endpoints estarão disponíveis:

### Handover Actions
```
POST   /api/v1/conversations/{id}/handover/bot/
POST   /api/v1/conversations/{id}/handover/human/
GET    /api/v1/conversations/{id}/handover/status/
GET    /api/v1/conversations/{id}/handover/logs/
POST   /api/v1/conversations/{id}/handover/request/
```

### Handover Requests
```
GET    /api/v1/requests/
POST   /api/v1/requests/
GET    /api/v1/requests/{id}/
POST   /api/v1/requests/{id}/approve/
POST   /api/v1/requests/{id}/reject/
```

### Handover Logs
```
GET    /api/v1/logs/
GET    /api/v1/logs/{id}/
```

## Teste Rápido

```bash
# 1. Verificar status de handover
curl -H "Authorization: Token <seu_token>" \
  https://backend.pastita.com.br/api/v1/conversations/<conversation_id>/handover/status/

# 2. Transferir para humano
curl -X POST -H "Authorization: Token <seu_token>" \
  https://backend.pastita.com.br/api/v1/conversations/<conversation_id>/handover/human/

# 3. Transferir para bot
curl -X POST -H "Authorization: Token <seu_token>" \
  https://backend.pastita.com.br/api/v1/conversations/<conversation_id>/handover/bot/
```

## Integração com Frontend

O frontend já tem o `handoverService` configurado em:
- `src/services/handover.ts`
- `src/hooks/useHandover.ts`

Apenas certifique-se de que os endpoints do backend correspondem aos chamados pelo serviço.

## Modelos Criados

### ConversationHandover
- `conversation` (OneToOne com Conversation)
- `status` (bot/human/pending)
- `assigned_to` (ForeignKey para User)
- `last_transfer_at`
- `last_transfer_by`
- `transfer_reason`

### HandoverRequest
- `conversation` (ForeignKey)
- `status` (pending/approved/rejected/expired)
- `requested_by`
- `reason`
- `priority` (low/medium/high/urgent)
- `approved_by`
- `assigned_to`

### HandoverLog
- `conversation` (ForeignKey)
- `from_status` / `to_status`
- `performed_by`
- `assigned_to`
- `reason`
- `created_at`

## Próximos Passos

1. Copiar os arquivos do backend
2. Criar migrações
3. Aplicar migrações
4. Testar endpoints
5. Verificar integração com WebSocket
