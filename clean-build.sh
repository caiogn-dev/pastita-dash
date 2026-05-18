#!/bin/bash
# Script para limpar cache e recompilar

echo "🧹 Limpando cache..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist

echo "📦 Reinstalando tipos..."
npm install

echo "🔨 Compilando..."
npm run build
