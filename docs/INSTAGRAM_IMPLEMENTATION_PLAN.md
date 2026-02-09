# Plano de Implementação - Instagram Module (pastita-dash)

## ✅ FASE 1: Correções Críticas (CONCLUÍDO)

### Arquivos Corrigidos:
1. **`src/services/instagram.ts`**
   - [x] Adicionado `PaginatedResponse<T>` interface
   - [x] Corrigido `InstagramMessage` com `direction`, `status`, `text_content`
   - [x] Corrigido `InstagramConversation` com `last_message_preview`
   - [x] Atualizado `getConversations()` - usa query params
   - [x] Atualizado `getMessages()` - usa query params
   - [x] Corrigido `sendTyping()` - 2 parâmetros (accountId, recipientId)
   - [x] Corrigido `markSeen()` - 2 parâmetros (accountId, senderId)
   - [x] Corrigido `sendMessage()` - endpoint e payload alinhados

2. **`src/pages/instagram/InstagramInbox.tsx`**
   - [x] Ajustado uso de `response.data.results` (PaginatedResponse)
   - [x] Adicionado helper `getStatusIcon()` com fallback
   - [x] Corrigido null-safety em `formatTime()`
   - [x] Melhorado error handling no typing indicator

---

## 📋 FASE 2: Planejamento - Instagram Shopping/Catálogo

### 🚨 Problema Identificado: Autenticação
> "/catalog só está acessível quando eu estou logado... para meu cardápio não é bom"

**Análise:** O Instagram Shopping requer:
1. Conta Business/Creator verificada
2. Catálogo no Facebook Commerce Manager
3. Aprovação do Instagram para shopping
4. Usuário logado no Instagram para visualizar produtos

**Solução para Cardápio Público:**

### Opção A: Modo "Cardápio" vs "Shopping" (Recomendada)

```
┌─────────────────────────────────────────────────────────┐
│  INSTAGRAM SHOPPING MODULE                              │
├─────────────────────────────────────────────────────────┤
│  1. CATALOG MANAGEMENT (Admin Only - Requer Login)     │
│     - Criar/editar catálogos                            │
│     - Sincronizar produtos                              │
│     - Gerenciar preços/estoque                          │
│                                                         │
│  2. PRODUCT SHOWCASE (Público - Não Requer Login)      │
│     - Widget de cardápio para site                      │
│     - API pública (read-only)                           │
│     - QR Code para cardápio                             │
│                                                         │
│  3. CHECKOUT OPTIONS                                    │
│     - Link externo (WhatsApp/Pedido)                    │
│     - Instagram Checkout (se disponível)                │
└─────────────────────────────────────────────────────────┘
```

### Implementação Técnica:

#### Backend - Novos Endpoints Públicos:

```python
# apps/instagram/api/public_views.py
# Endpoints que NÃO requerem autenticação

GET /api/v1/public/catalogs/<store_slug>/         # Lista catálogos da loja
GET /api/v1/public/catalogs/<id>/products/        # Lista produtos (read-only)
GET /api/v1/public/products/<id>/                 # Detalhe do produto
```

#### Frontend - Novas Páginas:

```
src/pages/instagram/
├── InstagramInbox.tsx              # ✅ Corrigido
├── InstagramAccounts.tsx           # Já existe
├── InstagramMedia.tsx              # Já existe
├── InstagramStories.tsx            # Já existe
├── InstagramReels.tsx              # Já existe
├── InstagramLive.tsx               # Já existe
├── InstagramComments.tsx           # Já existe
├── InstagramInsights.tsx           # Já existe
├── InstagramCatalog.tsx            # 🆕 Gerenciamento (admin)
├── InstagramProducts.tsx           # 🆕 Gerenciamento (admin)
└── Showcase/
    ├── ProductWidget.tsx           # 🆕 Widget embeddable
    ├── MenuPage.tsx                # 🆕 Página de cardápio pública
    └── ProductQRCode.tsx           # 🆕 Geração de QR Code
```

---

## 📊 FASE 3: Checklist de Implementação

### Módulo de Mensagens (DM) - 90% ✅
- [x] InstagramInbox corrigido
- [ ] Testar envio/recebimento de mensagens
- [ ] Implementar WebSocket para mensagens em tempo real
- [ ] Adicionar suporte a mídia (imagens/vídeos)
- [ ] Reactions em mensagens

### Módulo de Contas - 80% ✅
- [x] Listagem de contas
- [x] Conectar nova conta
- [ ] Sincronização automática de tokens
- [ ] Insights básicos

### Módulo de Mídia (Posts/Stories/Reels) - 70%
- [x] Estrutura base
- [ ] Agendamento de posts
- [ ] Upload de mídia
- [ ] Analytics por post

### Módulo de Shopping - 0% 🆕
- [ ] **Fase 3.1: Backend Público**
  - [ ] Criar endpoints públicos (read-only)
  - [ ] Configurar permissões (AllowAny para leitura)
  - [ ] Sistema de slug para lojas
  
- [ ] **Fase 3.2: Admin (Requer Login)**
  - [ ] Página de catálogos
  - [ ] Página de produtos
  - [ ] Sincronização com Facebook Commerce
  - [ ] Importação em massa
  
- [ ] **Fase 3.3: Cardápio Público (Não Requer Login)**
  - [ ] Widget embeddable
  - [ ] Página standalone (/cardapio/<loja>)
  - [ ] QR Code generator
  - [ ] Tema customizável

### Módulo de Lives - 0%
- [ ] Agendamento de lives
- [ ] Pin de produtos durante live
- [ ] Métricas ao vivo

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

### Prioridade 1: Testar Build
```bash
cd C:\Users\User\Documents\pastita-dash
npm run build
```

### Prioridade 2: Implementar Shopping (Admin)
1. Criar `src/pages/instagram/InstagramCatalog.tsx`
2. Criar `src/pages/instagram/InstagramProducts.tsx`
3. Adicionar rotas no router

### Prioridade 3: Backend Público (API)
1. Criar `apps/instagram/api/public_views.py`
2. Configurar URLs públicas
3. Sistema de slug para lojas

### Prioridade 4: Cardápio Público
1. Criar `src/pages/instagram/Showcase/MenuPage.tsx`
2. Widget embeddable
3. QR Code generator

---

## 🔧 Notas Técnicas

### Questão do Login/Catálogo:
- **Instagram Shopping API** é fechada e requer autenticação
- **Solução:** Separar "gestão de catálogo" (admin) de "exibição de produtos" (público)
- O catálogo público é uma cópia read-only dos produtos, servida via API aberta

### Endpoints Necessários (Backend):

```python
# Admin (requer auth)
POST   /instagram/catalogs/
PATCH  /instagram/catalogs/<id>/
DELETE /instagram/catalogs/<id>/
POST   /instagram/products/
PATCH  /instagram/products/<id>/
DELETE /instagram/products/<id>/

# Público (não requer auth)
GET    /public/catalogs/<store_slug>/
GET    /public/catalogs/<id>/products/
GET    /public/products/<id>/
```

### Modelo de Dados Público:

```typescript
interface PublicCatalog {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  store_name: string;
  store_logo?: string;
}

interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  // Sem campos sensíveis (custo, margem, etc)
}
```

---

## 📅 Timeline Sugerida

| Semana | Tarefa |
|--------|--------|
| Semana 1 | Testar build, corrigir bugs do inbox, implementar admin de catálogo |
| Semana 2 | Backend público, API read-only, sistema de slug |
| Semana 3 | Frontend cardápio público, widget, QR code |
| Semana 4 | Integração WhatsApp (pedido via cardápio), polish |

---

## 🤔 Decisões Pendentes

1. **O usuário quer que eu implemente o Shopping agora?**
   - Sim → Começar Fase 3.2 (Admin) + 3.1 (Backend público)
   - Não → Finalizar testes do DM e seguir para outro módulo

2. **Qual o slug da loja?**
   - Usar username do Instagram?
   - Criar slug customizável?
   - Usar ID da store?

3. **Checkout:**
   - Link para WhatsApp com mensagem pré-preenchida?
   - Integração com sistema de pedidos existente?
   - Apenas "mostrar cardápio" sem checkout?
