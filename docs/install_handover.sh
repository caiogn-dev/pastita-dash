#!/bin/bash
# Script de instalação do Handover Protocol no backend
# Executar no servidor: bash install_handover.sh

echo "=== Instalando Handover Protocol ==="

# 1. Criar estrutura
mkdir -p /app/apps/handover
touch /app/apps/handover/__init__.py

# 2. Criar apps.py
cat > /app/apps/handover/apps.py << 'EOF'
from django.apps import AppConfig


class HandoverConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.handover'
    verbose_name = 'Handover Protocol'
EOF

# 3. Copiar arquivos (assumindo que estão em /tmp/docs/)
echo "Copiando arquivos..."
cp /tmp/docs/backend_handover_models.py /app/apps/handover/models.py
cp /tmp/docs/backend_handover_serializers.py /app/apps/handover/serializers.py
cp /tmp/docs/backend_handover_views.py /app/apps/handover/views.py
cp /tmp/docs/backend_handover_urls.py /app/apps/handover/urls.py
cp /tmp/docs/backend_handover_consumers.py /app/apps/handover/consumers.py

# 4. Adicionar a INSTALLED_APNS (se ainda não estiver)
if ! grep -q "apps.handover" /app/config/settings/base.py; then
    echo "Adicionando apps.handover em INSTALLED_APPS..."
    sed -i "/INSTALLED_APPS = \[/a\    'apps.handover'," /app/config/settings/base.py
fi

# 5. Adicionar URLs (se ainda não estiver)
if ! grep -q "handover.urls" /app/config/urls.py; then
    echo "Adicionando URLs do handover..."
    sed -i "/urlpatterns = \[/a\    path('api/v1/', include('apps.handover.urls'))," /app/config/urls.py
fi

# 6. Criar migrações
echo "Criando migrações..."
cd /app
python manage.py makemigrations handover

# 7. Aplicar migrações
echo "Aplicando migrações..."
python manage.py migrate

echo "=== Instalação concluída! ==="
echo "Endpoints disponíveis:"
echo "  POST /api/v1/conversations/{id}/handover/bot/"
echo "  POST /api/v1/conversations/{id}/handover/human/"
echo "  GET  /api/v1/conversations/{id}/handover/status/"
