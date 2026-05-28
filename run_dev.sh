#!/bin/bash
# Script para rodar o frontend em modo desenvolvimento na porta 3010

cd /home/graco/WORK/pastita-dash

echo "🚀 Iniciando frontend em modo DEV na porta 3010..."
echo "📍 Acesse: http://localhost:3010"
echo "🌐 Ou: http://dev.painel.cardapidex.com.br (após configurar túnel)"
echo ""
echo "⚠️  Certifique-se de que o backend está rodando em produção"
echo ""

# Rodar em modo dev
npm run dev
