# 🔍 AUDITORIA TÉCNICA DA API - PLANEJAMENTO DE ATUALIZAÇÃO

## 📋 RESUMO EXECUTIVO

**Data:** 31/01/2025  
**Projeto:** Pastita Dashboard  
**Objetivo:** Atualizar frontend para alinhar com API Django em produção

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. Erro 500 em `/automation/messages/`
**Status:** 🔴 CRÍTICO  
**Endpoint:** `GET /api/v1/automation/messages/?company_id=1`  
**Erro:** 500 Internal Server Error  
**Impacto:** Página AutoMessagesPage não funciona  
**Ação necessária:** Verificar se endpoint mudou ou foi removido

### 2. Duplicação de Serviços
**Status:** 🔴 CRÍTICO  
**Arquivos afetados:**
- `storesApi.ts` (1532 linhas) - API completa
- `storeApi.ts` (715 linhas) - API simplificada  
- `pastitaApi.ts` (742 linhas) - API legada
- `catalogService.ts` (504 linhas) - Possível duplicação
- `unifiedApi.ts` (225 linhas) - Possível duplicação

**Ação necessária:** Consolidar em um único serviço

### 3. Navbar Duplicada
**Status:** 🔴 CRÍTICO  
**Páginas afetadas:**
- DashboardPage.tsx - Ainda usa Header
- Outras páginas podem ter sido revertidas

**Ação necessária:** Remover Header de todas as páginas

---

## 📊 MAPEAMENTO DE ENDPOINTS

### ✅ ENDPOINTS CONFIRMADOS (Retornam 401 = Existem)

| Endpoint | Status | Observação |
|----------|--------|------------|
| `/api/v1/stores/` | ✅ | Requer auth |
| `/api/v1/stores/orders/` | ✅ | Requer auth |
| `/api/v1/automation/companies/` | ✅ | Requer auth |
| `/api/v1/automation/messages/` | ❌ | Erro 500 - INVESTIGAR |

### ❌ ENDPOINTS COM PROBLEMAS

| Endpoint | Status | Erro | Ação |
|----------|--------|------|------|
| `/automation/messages/` | 🔴 | 500 | Verificar backend |

---

## 🗂️ ESTRUTURA DE SERVIÇOS ATUAL

### Serviços Core (Manter)
- `api.ts` - Cliente HTTP base
- `auth.ts` - Autenticação
- `logger.ts` - Logging

### Serviços Duplicados (Consolidar)
```
storesApi.ts (1532 linhas) ← MANTER (mais completo)
  ├── Store
  ├── StoreInput
  ├── StoreIntegration
  └── ...

storeApi.ts (715 linhas) ← REMOVER/MERGE
  ├── Product
  ├── Order
  └── ... (duplicado)

pastitaApi.ts (742 linhas) ← REMOVER (legado)
  ├── Produto
  ├── Pedido
  └── ... (não usar mais)
```

### Serviços de Automação (Verificar)
- `automation.ts` - Erro 500 em messages
- `langflow.ts` - Verificar endpoints
- `scheduling.ts` - Verificar endpoints

### Serviços de Comunicação (Verificar)
- `whatsapp.ts` - Verificar endpoints
- `instagram.ts` - Verificar endpoints
- `conversations.ts` - Verificar endpoints

### Serviços de Negócio (Verificar)
- `orders.ts` - Usa `/stores/orders/`
- `payments.ts` - Verificar se existe na API
- `products.ts` - Verificar endpoints
- `coupons.ts` - Verificar endpoints
- `delivery.ts` - Verificar endpoints

---

## 📝 PLANO DE AÇÃO DETALHADO

### FASE 1: DIAGNÓSTICO (1-2 horas)

#### Tarefa 1.1: Mapear endpoints reais
```bash
# Testar cada endpoint manualmente
# Documentar quais retornam 200, 401, 404, 500
```

**Endpoints a testar:**
1. `/api/v1/stores/`
2. `/api/v1/stores/orders/`
3. `/api/v1/stores/products/`
4. `/api/v1/stores/coupons/`
5. `/api/v1/stores/payments/` ← CRÍTICO
6. `/api/v1/stores/delivery-zones/`
7. `/api/v1/automation/companies/`
8. `/api/v1/automation/messages/` ← PROBLEMA
9. `/api/v1/automation/sessions/`
10. `/api/v1/automation/logs/`
11. `/api/v1/whatsapp/accounts/`
12. `/api/v1/conversations/`
13. `/api/v1/instagram/accounts/`
14. `/api/v1/marketing/campaigns/`
15. `/api/v1/langflow/flows/`

#### Tarefa 1.2: Auditar types
**Arquivo:** `src/types/index.ts`

Verificar se todos os types estão alinhados com a API:
- Store
- Order
- Product
- Coupon
- Payment ← PROVAVELMENTE DESATUALIZADO
- AutoMessage ← VERIFICAR
- CompanyProfile ← VERIFICAR

### FASE 2: LIMPEZA (2-3 horas)

#### Tarefa 2.1: Remover código morto
**Arquivos para remover:**
- `pastitaApi.ts` (se não for usado)
- `storeApi.ts` (merge com storesApi.ts)
- `catalogService.ts` (verificar duplicação)
- `unifiedApi.ts` (verificar duplicação)

#### Tarefa 2.2: Consolidar serviços
**Ação:** Unificar `storesApi.ts` e `storeApi.ts`

**Estrutura final:**
```typescript
// storesApi.ts - Único arquivo de stores
export interface Store { ... }
export interface Product { ... }
export interface Order { ... }
// ... todos os types

export const storesApi = {
  // Stores
  getStores: () => ...
  getStore: (id) => ...
  
  // Products
  getProducts: (storeId) => ...
  
  // Orders
  getOrders: (storeId) => ...
  
  // ... etc
}
```

### FASE 3: CORREÇÃO (3-4 horas)

#### Tarefa 3.1: Corrigir automação
**Problema:** Erro 500 em `/automation/messages/`

**Possíveis causas:**
1. Endpoint mudou para `/automation/companies/{id}/messages/`
2. Parâmetro `company_id` deve ser passado de outra forma
3. Endpoint foi removido

**Ação:**
- Verificar documentação Django
- Ou testar variações do endpoint
- Atualizar `automation.ts`

#### Tarefa 3.2: Corrigir pagamentos
**Problema:** `/payments` pode não existir na API

**Verificar:**
- `/api/v1/stores/payments/` existe?
- Ou pagamentos são só um campo em orders?

**Ação:**
- Se não existir: remover PaymentsPage
- Se existir: atualizar serviço

#### Tarefa 3.3: Corrigir navbar duplicada
**Páginas para verificar:**
- [ ] DashboardPage.tsx
- [ ] OrdersPage.tsx
- [ ] PaymentsPage.tsx
- [ ] ProductsPageNew.tsx
- [ ] CouponsPage.tsx
- [ ] SettingsPage.tsx
- [ ] StoresPage.tsx
- [ ] StoreDetailPage.tsx
- [ ] StoreSettingsPage.tsx
- [ ] MarketingPage.tsx
- [ ] SubscribersPage.tsx
- [ ] AutomationsPage.tsx
- [ ] CampaignsListPage.tsx
- [ ] NewCampaignPage.tsx
- [ ] WhatsAppCampaignsPage.tsx
- [ ] NewWhatsAppCampaignPage.tsx
- [ ] InstagramAccounts.tsx
- [ ] InstagramInbox.tsx
- [ ] LangflowPage.tsx
- [ ] CompanyProfilesPage.tsx
- [ ] CompanyProfileDetailPage.tsx
- [ ] AutoMessagesPage.tsx
- [ ] CustomerSessionsPage.tsx
- [ ] AutomationLogsPage.tsx
- [ ] ScheduledMessagesPage.tsx
- [ ] ReportsPage.tsx
- [ ] AnalyticsPage.tsx
- [ ] DeliveryZonesPage.tsx
- [ ] WebhookDiagnosticsPage.tsx
- [ ] AccountsPage.tsx
- [ ] AccountFormPage.tsx
- [ ] AccountDetailPage.tsx
- [ ] MessagesPage.tsx
- [ ] ConversationsPage.tsx

### FASE 4: ATUALIZAÇÃO (2-3 horas)

#### Tarefa 4.1: Atualizar Sidebar
**Já feito:** ✅ Navegação baseada em store

**Verificar:**
- Links de pagamentos apontam para loja selecionada
- Links de produtos apontam para loja selecionada
- Mensagem quando não há loja selecionada

#### Tarefa 4.2: Atualizar páginas de loja
**Páginas:**
- StoresPage.tsx
- StoreDetailPage.tsx
- StoreSettingsPage.tsx

**Verificar:**
- Usam storesApi.ts corretamente
- Não usam endpoints antigos

#### Tarefa 4.3: Atualizar páginas de automação
**Páginas:**
- CompanyProfilesPage.tsx
- AutoMessagesPage.tsx ← CRÍTICO
- CustomerSessionsPage.tsx
- AutomationLogsPage.tsx
- ScheduledMessagesPage.tsx

**Ação:**
- Corrigir chamadas à API
- Tratar erros 500

### FASE 5: TESTES (1-2 horas)

#### Tarefa 5.1: Testar build
```bash
npm run build
```

#### Tarefa 5.2: Testar navegação
- [ ] Todas as rotas carregam
- [ ] Sem erros 404
- [ ] Sem erros 500

#### Tarefa 5.3: Testar funcionalidades
- [ ] Login funciona
- [ ] Seleção de loja funciona
- [ ] Dashboard carrega dados
- [ ] Pedidos carregam
- [ ] Produtos carregam
- [ ] Automação funciona (se corrigido)

---

## 📁 ARQUIVOS PARA MODIFICAR

### Alta Prioridade
1. `src/services/automation.ts` - Corrigir erro 500
2. `src/services/index.ts` - Remover exports legados
3. `src/services/pastitaApi.ts` - Remover se não usado
4. `src/services/storeApi.ts` - Merge com storesApi.ts
5. `src/pages/automation/AutoMessagesPage.tsx` - Corrigir chamada API
6. `src/pages/dashboard/DashboardPage.tsx` - Remover Header

### Média Prioridade
7. `src/pages/payments/PaymentsPage.tsx` - Verificar se endpoint existe
8. `src/types/index.ts` - Atualizar types
9. `src/services/payments.ts` - Verificar endpoints
10. `src/services/langflow.ts` - Verificar endpoints

### Baixa Prioridade
11. `src/services/instagram.ts` - Verificar endpoints
12. `src/services/whatsapp.ts` - Verificar endpoints
13. `src/hooks/*.ts` - Verificar se usam APIs corretas
14. `src/stores/*.ts` - Verificar se usam APIs corretas

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Tempo Estimado |
|------|----------------|
| Fase 1: Diagnóstico | 1-2 horas |
| Fase 2: Limpeza | 2-3 horas |
| Fase 3: Correção | 3-4 horas |
| Fase 4: Atualização | 2-3 horas |
| Fase 5: Testes | 1-2 horas |
| **TOTAL** | **9-14 horas** |

---

## 🎯 CRITÉRIOS DE SUCESSO

- [ ] Build passa sem erros
- [ ] Nenhuma página tem navbar duplicada
- [ ] Navegação funciona corretamente com store selecionada
- [ ] Erro 500 em `/automation/messages/` resolvido
- [ ] Código morto removido
- [ ] Serviços duplicados consolidados
- [ ] Types atualizados
- [ ] Páginas de automação funcionando

---

## 📝 NOTAS

- API Base: `https://web-production-3e83a.up.railway.app/api/v1/`
- Autenticação: Token-based
- Formato: JSON
- Paginação: Padrão Django REST Framework

**Próximo passo:** Iniciar Fase 1 - Diagnóstico completo dos endpoints