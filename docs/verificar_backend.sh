#!/bin/bash
# VERIFICAR BACKEND - Script de diagnóstico
# Rode este script no servidor para verificar o estado atual

echo "=========================================="
echo "VERIFICAÇÃO DO BACKEND PASTITA"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /app

echo "1. VERIFICANDO ESTRUTURA DE APPS..."
echo "=========================================="

# Verificar se handover existe
if [ -d "apps/handover" ]; then
    echo -e "${GREEN}✅${NC} App 'handover' existe"
    if [ -f "apps/handover/models.py" ]; then
        echo -e "${GREEN}✅${NC}   └── models.py existe"
    else
        echo -e "${RED}❌${NC}   └── models.py NÃO existe"
    fi
else
    echo -e "${RED}❌${NC} App 'handover' NÃO existe (precisa instalar)"
fi

echo ""
echo "2. VERIFICANDO ENDPOINTS INSTAGRAM..."
echo "=========================================="

# Verificar se instagram views existem
if [ -f "apps/instagram/views.py" ]; then
    echo -e "${GREEN}✅${NC} apps/instagram/views.py existe"
    
    # Verificar endpoints específicos
    if grep -q "conversations" apps/instagram/views.py; then
        echo -e "${GREEN}✅${NC}   └── Endpoint 'conversations' encontrado"
    else
        echo -e "${RED}❌${NC}   └── Endpoint 'conversations' NÃO encontrado"
    fi
    
    if grep -q "send-message" apps/instagram/urls.py 2>/dev/null; then
        echo -e "${GREEN}✅${NC}   └── URL 'send-message' existe"
    else
        echo -e "${RED}❌${NC}   └── URL 'send-message' NÃO existe"
    fi
else
    echo -e "${RED}❌${NC} apps/instagram/views.py NÃO existe"
fi

echo ""
echo "3. VERIFICANDO ENDPOINTS MESSENGER..."
echo "=========================================="

if [ -f "apps/messenger/views.py" ]; then
    echo -e "${GREEN}✅${NC} apps/messenger/views.py existe"
    
    if grep -q "conversations" apps/messenger/views.py; then
        echo -e "${GREEN}✅${NC}   └── Endpoint 'conversations' encontrado"
    else
        echo -e "${RED}❌${NC}   └── Endpoint 'conversations' NÃO encontrado"
    fi
else
    echo -e "${RED}❌${NC} apps/messenger/views.py NÃO existe"
fi

echo ""
echo "4. VERIFICANDO FIX DO AGENTE..."
echo "=========================================="

if [ -f "apps/whatsapp/webhooks/views.py" ]; then
    if grep -q "is_active" apps/whatsapp/webhooks/views.py; then
        echo -e "${GREEN}✅${NC} Verificação 'is_active' encontrada no webhook"
    else
        echo -e "${RED}❌${NC} Verificação 'is_active' NÃO encontrada no webhook"
    fi
else
    echo -e "${RED}❌${NC} apps/whatsapp/webhooks/views.py NÃO encontrado"
fi

if [ -f "apps/whatsapp/tasks/__init__.py" ]; then
    if grep -q "is_active" apps/whatsapp/tasks/__init__.py; then
        echo -e "${GREEN}✅${NC} Verificação 'is_active' encontrada nas tasks"
    else
        echo -e "${RED}❌${NC} Verificação 'is_active' NÃO encontrada nas tasks"
    fi
else
    echo -e "${RED}❌${NC} apps/whatsapp/tasks/__init__.py NÃO encontrado"
fi

echo ""
echo "5. TESTANDO ENDPOINTS VIA CURL..."
echo "=========================================="

# Testar endpoint de handover (deve retornar 404 se não existe)
echo "Testando /api/v1/conversations/test/handover/status/..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/conversations/test/handover/status/ 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "404" ]; then
    echo -e "${RED}❌${NC} Handover endpoints retornam 404 (não instalado)"
elif [ "$HTTP_STATUS" = "401" ]; then
    echo -e "${YELLOW}⚠️${NC}  Retorna 401 (endpoint existe mas precisa autenticação)"
elif [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅${NC} Endpoint responde 200"
else
    echo -e "${RED}❌${NC} Status: $HTTP_STATUS (servidor pode estar offline)"
fi

echo ""
echo "6. VERIFICANDO BANCO DE DADOS..."
echo "=========================================="

# Verificar se tabelas do handover existem
if docker-compose exec -T db psql -U postgres -d pastita -c "\dt" 2>/dev/null | grep -q "handover"; then
    echo -e "${GREEN}✅${NC} Tabelas do handover encontradas no banco"
else
    echo -e "${RED}❌${NC} Tabelas do handover NÃO encontradas (migração pendente)"
fi

echo ""
echo "=========================================="
echo "RESUMO:"
echo "=========================================="
echo ""
echo "Se você viu ❌ vermelho acima, precisa:"
echo ""
echo "1. INSTALAR HANDOVER:"
echo "   - Copiar arquivos de docs/backend_handover_*.py"
echo "   - Criar /app/apps/handover/"
echo "   - Rodar: python manage.py migrate"
echo ""
echo "2. CRIAR ENDPOINTS INSTAGRAM/MESSENGER:"
echo "   - Copiar arquivos docs/backend_instagram_views.py"
echo "   - Copiar arquivos docs/backend_messenger_views.py"
echo ""
echo "3. APLICAR FIX DO AGENTE:"
echo "   - Editar webhook para verificar is_active"
echo "   - Editar tasks para verificar is_active"
echo ""
