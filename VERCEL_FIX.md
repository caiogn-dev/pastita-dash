# FIX: Erro "There was a permanent problem cloning the repo" na Vercel

## 🚨 Problema
O erro indica que a Vercel não consegue clonar o repositório do GitHub.
Isso é um problema de **permissão do token**, não de código.

## 🔧 Soluções

### Opção 1: Reconectar Repositório na Vercel

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto `pastita-dash`
3. Vá em **Settings** → **Git**
4. Clique em **"Disconnect"**
5. Clique em **"Connect Git Repository"**
6. Selecione `caiogn-dev/pastita-dash`
7. Reautorize o GitHub se pedir

---

### Opção 2: Reinstalar GitHub App da Vercel

1. Acesse: https://github.com/settings/applications
2. Procure por "Vercel"
3. Clique em **"Configure"**
4. Em "Repository access", garanta que `caiogn-dev/pastita-dash` está selecionado
5. Salve

---

### Opção 3: Recriar Projeto na Vercel

Se as opções acima não funcionarem:

1. Delete o projeto na Vercel (não afeta o código)
2. Crie novo projeto: https://vercel.com/new
3. Importe `caiogn-dev/pastita-dash`
4. Configure:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `./`

---

### Opção 4: Verificar Token do GitHub

O token no remote pode estar expirado:

```bash
# Verificar qual token está sendo usado
cd C:\Users\User\Documents\pastita-dash
git remote -v

# Se mostrar token antigo, atualize:
git remote set-url origin https://caiogn-dev:SEU_NOVO_TOKEN@github.com/caiogn-dev/pastita-dash.git
```

Para gerar novo token:
1. https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes: `repo`, `read:org`
4. Copie o token e atualize a URL

---

## ✅ Verificação Local

O código está correto. Para confirmar:

```bash
cd C:\Users\User\Documents\pastita-dash
git status
# Deve mostrar: "nothing to commit, working tree clean"

git log --oneline -3
# Deve mostrar commits recentes
```

---

## 📊 Status do Repositório

- ✅ GitHub: https://github.com/caiogn-dev/pastita-dash
- ✅ Último commit: `e8a79b3` - docs: add backend verification scripts
- ✅ Branch: `main`
- ✅ Código: Funcionando

**O problema é apenas na integração Vercel ↔ GitHub**, não no código.

---

## 🚀 Comando Rápido para Testar Deploy

Se quiser testar deploy manual:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Ou simplesmente reconecte o repositório na dashboard da Vercel.
