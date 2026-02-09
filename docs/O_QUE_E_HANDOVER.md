# O QUE É "INSTALAR O HANDOVER PROTOCOL"?

## 🤔 Explicação Simples

O **Handover Protocol** é um **NOVO MÓDULO** (app Django) que **NÃO EXISTE** no seu backend ainda.

### Analogia
Imagine que seu backend é uma casa com vários cômodos:
- Sala = WhatsApp
- Quarto = Instagram  
- Cozinha = Messenger

O **Handover** é um **NOVO CÔMODO** que precisa ser construído do zero. Não é algo que "ativa", é algo que "cria".

---

## 📦 O Que Precisa Ser Criado

### 1. Estrutura de Pastas (NOVO)
```
/app/apps/
├── whatsapp/          ← já existe
├── instagram/         ← já existe  
├── messenger/         ← já existe
├── handover/          ← 🚨 NÃO EXISTE (precisa criar)
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py      ← tabelas do banco
│   ├── views.py       ← endpoints API
│   ├── urls.py        ← rotas
│   └── consumers.py   ← websocket
```

### 2. Tabelas no Banco de Dados (NOVO)
O Handover precisa de 3 tabelas novas:
- `handover_conversationhandover` - Status atual (bot/human)
- `handover_handoverrequest` - Solicitações pendentes
- `handover_handoverlog` - Histórico de transferências

### 3. Endpoints API (NOVO)
```
POST /api/v1/conversations/{id}/handover/bot/
POST /api/v1/conversations/{id}/handover/human/
GET  /api/v1/conversations/{id}/handover/status/
```

---

## 🔧 POR QUE NÃO ESTÁ FUNCIONANDO?

### Cenário Atual
```
Cliente manda mensagem
    ↓
Webhook recebe
    ↓
??? (não sabe para onde transferir)
    ↓
Sempre responde com Bot
```

### Cenário Com Handover
```
Cliente manda mensagem
    ↓
Webhook recebe
    ↓
Verifica handover.status
    ↓
Se "bot" → Responde com AI
Se "human" → Não responde (espera operador)
```

---

## 🚀 COMO INSTALAR (Passo a Passo)

### Passo 1: Criar Estrutura
```bash
ssh seu-servidor
cd /app
mkdir -p apps/handover
touch apps/handover/__init__.py
```

### Passo 2: Copiar Arquivos
```bash
# Os arquivos estão em docs/ do frontend
# Você precisa copiá-los para o backend:

cp docs/backend_handover_models.py      apps/handover/models.py
cp docs/backend_handover_serializers.py apps/handover/serializers.py
cp docs/backend_handover_views.py       apps/handover/views.py
cp docs/backend_handover_urls.py        apps/handover/urls.py
cp docs/backend_handover_consumers.py   apps/handover/consumers.py
```

### Passo 3: Criar apps.py
```bash
cat > apps/handover/apps.py << 'EOF'
from django.apps import AppConfig

class HandoverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.handover'
    verbose_name = 'Handover Protocol'
EOF
```

### Passo 4: Registrar no Django
Editar `config/settings/base.py`:
```python
INSTALLED_APPS = [
    # ... apps existentes ...
    'apps.handover',  # ← ADICIONAR ESTA LINHA
]
```

### Passo 5: Criar Tabelas no Banco
```bash
cd /app
python manage.py makemigrations handover
python manage.py migrate
```

### Passo 6: Adicionar URLs
Editar `config/urls.py`:
```python
urlpatterns = [
    # ... urls existentes ...
    path('api/v1/', include('apps.handover.urls')),  # ← ADICIONAR
]
```

### Passo 7: Restartar Servidor
```bash
docker-compose restart web
# ou
systemctl restart gunicorn
```

---

## ✅ VERIFICAR SE FUNCIONOU

Teste este endpoint:
```bash
curl -X GET \
  -H "Authorization: Token SEU_TOKEN" \
  https://backend.pastita.com.br/api/v1/conversations/QUALQUER_ID/handover/status/
```

**Se retornar:**
- `200 OK` → ✅ Handover instalado!
- `404 Not Found` → ❌ Não instalado
- `401 Unauthorized` → ✅ Endpoint existe, precisa de token válido

---

## 📊 RESUMO

| Pergunta | Resposta |
|----------|----------|
| "Handover já existe no meu backend?" | **NÃO** - Precisa criar do zero |
| "Por que não funciona?" | Porque o código **não existe** ainda |
| "Como instala?" | Copiando os arquivos de `docs/` para `apps/handover/` |
| "É difícil?" | Não, são 7 passos simples |

---

## 🆘 AUTOMATIZADO

Rode este comando no servidor para instalar tudo:

```bash
cd /app
bash docs/install_handover.sh
```

Ou copie e cole este comando único:

```bash
# 1. Criar estrutura
mkdir -p apps/handover
touch apps/handover/__init__.py

# 2. Copiar arquivos (ajuste o caminho se necessário)
cp /caminho/para/docs/backend_handover_*.py apps/handover/
mv apps/handover/backend_handover_models.py apps/handover/models.py
mv apps/handover/backend_handover_serializers.py apps/handover/serializers.py
mv apps/handover/backend_handover_views.py apps/handover/views.py
mv apps/handover/backend_handover_urls.py apps/handover/urls.py
mv apps/handover/backend_handover_consumers.py apps/handover/consumers.py

# 3. Criar apps.py
cat > apps/handover/apps.py << 'EOF'
from django.apps import AppConfig

class HandoverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.handover'
    verbose_name = 'Handover Protocol'
EOF

echo "✅ Arquivos criados! Agora edite settings.py e urls.py"
```

---

**Em resumo: O Handover é um novo módulo que precisa ser criado, não é algo que já existe para ser ativado.**
