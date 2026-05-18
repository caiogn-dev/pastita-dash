#!/bin/bash
# Script para forçar recompilação completa do TypeScript

echo "🧹 Limpando todos os caches..."

# Limpar caches do TypeScript
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf dist
rm -rf tsconfig.tsbuildinfo

# Limpar cache do npm
npm cache clean --force 2>/dev/null || true

# Limpar caches do sistema
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
find . -name ".eslintcache" -delete 2>/dev/null || true

echo "📦 Reinstalando dependências..."
npm install

echo "🔨 Compilando TypeScript..."
npx tsc --noEmit --skipLibCheck

echo "🏗️  Build completo..."
npm run build
