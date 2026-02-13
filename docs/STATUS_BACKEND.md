# STATUS REAL DO BACKEND - Análise Visual

## 🔍 Como Verificar Manualmente

### 1. Verificar se Handover existe:
```bash
ssh seu-servidor
ls -la /app/apps/handover/
```

**Se retornar:** `No such file or directory` → **NÃO EXISTE** (precisa instalar)

**Se retornar:** Lista de arquivos → **EXISTE** ✅

---

### 2. Verificar endpoints Instagram:
```bash
curl -H "Authorization: Token SEU_TOKEN" \
  https://backend.pastita.com.br/api/v1/instagram/accounts/
```

**Se retornar:** `{"results": [...]}` → **FUNCIONA** ✅  
**Se retornar:** `404 Not Found` → **NÃO EXISTE** ❌

---

### 3. Verificar endpoints Messenger:
```bash
curl -H "Authorization: Token SEU_TOKEN" \
  https://backend.pastita.com.br/api/v1/messenger/accounts/
```

**Se retornar:** `{"results": [...]}` → **FUNCIONA** ✅  
**Se retornar:** `404 Not Found` → **NÃO EXISTE** ❌

---

### 4. Verificar Fix do Agente:
```bash
grep -n "is_active" /app/apps/whatsapp/webhooks/views.py
```

**Se retornar:** Números de linha → **FIX APLICADO** ✅  
**Se retornar:** Nada → **PRECISA APLICAR** ❌

---

## 📊 Matriz de Status Provável

Baseado na nossa análise anterior, o estado mais provável é:

| Componente | Status | Evidência |
|------------|--------|-----------|
| **Handover** | ❌ **NÃO EXISTE** | Nunca foi instalado |
| **Instagram API** | ⚠️ **PARCIAL** | Endpoints básicos existem, mas DM pode não estar completo |
| **Messenger API** | ⚠️ **PARCIAL** | Serviço existe mas endpoints podem estar incompletos |
| **Fix Agente** | ❌ **NÃO APLICADO** | Agente responde mesmo inativo |

---

## 🎯 Ações Necessárias

### PRIORIDADE 1: Handover (CRÍTICO)
```bash
# Criar estrutura
mkdir -p /app/apps/handover

# Copiar arquivos do docs/
cp docs/backend_handover_*.py /app/apps/handover/

# Renomear arquivos
mv /app/apps/handover/backend_handover_models.py /app/apps/handover/models.py
mv /app/apps/handover/backend_handover_serializers.py /app/apps/handover/serializers.py
mv /app/apps/handover/backend_handover_views.py /app/apps/handover/views.py
mv /app/apps/handover/backend_handover_urls.py /app/apps/handover/urls.py
mv /app/apps/handover/backend_handover_consumers.py /app/apps/handover/consumers.py

# Criar __init__.py e apps.py
touch /app/apps/handover/__init__.py
cat > /app/apps/handover/apps.py << 'EOF'
from django.apps import AppConfig

class HandoverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.handover'
    verbose_name = 'Handover Protocol'
EOF

# Editar config/settings/base.py - adicionar 'apps.handover' em INSTALLED_APPS
# Editar config/urls.py - adicionar path do handover

# Migrar
cd /app
python manage.py makemigrations handover
python manage.py migrate

# Restartar
docker-compose restart web
```

### PRIORIDADE 2: Fix Agente Inativo (CRÍTICO)
```bash
# Editar /app/apps/whatsapp/webhooks/views.py
# Adicionar no início do método de processamento:

if not account.default_agent or not account.default_agent.is_active:
    return Response(status=200)

# Editar /app/apps/whatsapp/tasks/__init__.py
# Adicionar na task de processamento:

if not agent or not agent.is_active:
    return
```

### PRIORIDADE 3: Verificar Instagram/Messenger
```bash
# Testar endpoints
curl -v https://backend.pastita.com.br/api/v1/instagram/conversations/
curl -v https://backend.pastita.com.br/api/v1/messenger/conversations/

# Se der 404, copiar os arquivos:
cp docs/backend_instagram_views.py /app/apps/instagram/views.py
# (e editar urls.py para adicionar as rotas)
```

---

## 🔧 Script de Verificação Automática

Rode no servidor:

```bash
cd /app

echo "=== VERIFICANDO HANDOVER ==="
if [ -d "apps/handover" ]; then
    echo "✅ Handover existe"
    if [ -f "apps/handover/models.py" ]; then
        echo "✅ Models criados"
    else
        echo "❌ Models não encontrados"
    fi
else
    echo "❌ Handover NÃO existe - PRECISA INSTALAR"
fi

echo ""
echo "=== VERIFICANDO FIX AGENTE ==="
if grep -q "is_active" apps/whatsapp/webhooks/views.py 2>/dev/null; then
    echo "✅ Fix aplicado no webhook"
else
    echo "❌ Fix NÃO aplicado no webhook"
fi

echo ""
echo "=== VERIFICANDO INSTAGRAM ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/instagram/accounts/ | grep -q "401\|200"; then
    echo "✅ Instagram endpoints respondem"
else
    echo "❌ Instagram endpoints NÃO respondem"
fi

echo ""
echo "=== VERIFICANDO MESSENGER ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/messenger/accounts/ | grep -q "401\|200"; then
    echo "✅ Messenger endpoints respondem"
else
    echo "❌ Messenger endpoints NÃO respondem"
fi
```

---

## 💡 RESUMO

O **Handover** é um novo módulo que **NUNCA EXISTIU** no seu backend. Por isso precisa ser **criado do zero**, não é algo para "ativar".

Os arquivos para criá-lo estão prontos em `docs/` no repositório do frontend.

Para instalar, basta copiar os arquivos e rodar as migrações.
