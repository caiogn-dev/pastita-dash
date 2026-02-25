# 📊 ANÁLISE: Páginas vs Sidebar

## ✅ Páginas NO SIDEBAR (implementadas)

### Principal
- [x] Dashboard → `/`
- [x] Pedidos → `/stores/:slug/orders` → OrdersPage
- [x] Produtos → `/stores/:slug/products` → ProductsPageNew
- [x] Cupons → `/stores/:slug/coupons` → CouponsPage

### Comunicação
- [x] Conversas → `/conversations` → ConversationsPage
- [x] WhatsApp Chat → `/whatsapp/chat` → WhatsAppChatPage
- [x] WhatsApp Contas → `/accounts` → AccountsPage
- [x] WhatsApp Templates → `/marketing/whatsapp/templates` → WhatsAppTemplatesPage
- [x] WhatsApp Analytics → `/analytics` → AnalyticsPage
- [x] WhatsApp Diagnóstico → `/whatsapp/diagnostics` → WebhookDiagnosticsPage
- [x] Instagram Mensagens → `/instagram/inbox` → InstagramInbox
- [x] Instagram Contas → `/instagram/accounts` → InstagramAccountsPage
- [x] Messenger Mensagens → `/messenger/inbox` → MessengerInbox
- [x] Messenger Contas → `/messenger/accounts` → MessengerAccounts
- [x] Marketing Dashboard → `/marketing` → MarketingPage
- [x] Marketing Campanhas Email → `/marketing/email/campaigns` → CampaignsListPage
- [x] Marketing Campanhas WhatsApp → `/marketing/whatsapp` → WhatsAppCampaignsPage
- [x] Marketing Templates → `/marketing/whatsapp/templates` → WhatsAppTemplatesPage
- [x] Marketing Assinantes → `/marketing/subscribers` → SubscribersPage
- [x] Marketing Automações → `/marketing/automations` → AutomationsPage

### Automação & IA
- [x] Agentes IA → `/agents` → AgentsPage
- [x] Testar Orquestrador → `/agents/test/orchestrator` → UnifiedOrchestratorTest
- [x] Automação Empresas → `/automation/companies` → CompanyProfilesPage
- [x] Automação Sessões → `/automation/sessions` → CustomerSessionsPage
- [x] Automação Agendamentos → `/automation/scheduled` → ScheduledMessagesPage
- [x] Automação Logs → `/automation/logs` → AutomationLogsPage
- [x] Automação Relatórios → `/automation/reports` → ReportsPage
- [x] Intenções Estatísticas → `/automation/intents` → IntentStatsPage
- [x] Intenções Logs → `/automation/intents/logs` → IntentLogsPage

### Analytics & Dados
- [x] Analytics → `/stores/:slug/analytics` → AnalyticsPage
- [x] Relatórios → `/reports` → ReportsPage (duplicado?)
- [x] Lojas Todas → `/stores` → StoresPage
- [x] Lojas Configurações → `/stores/:slug/settings` → StoreSettingsPage
- [x] Lojas Pagamentos → `/stores/:slug/payments` → PaymentsPage

## ❌ Páginas EXISTENTES mas NÃO NO SIDEBAR (órfãs)

### accounts/
- [ ] AccountDetailPage.tsx → `/accounts/:id` - **FALTA NO SIDEBAR**
- [ ] AccountFormPage.tsx → `/accounts/new` ou `/accounts/:id/edit` - **FALTA NO SIDEBAR**

### agents/
- [ ] AgentCreatePage.tsx → `/agents/new` - **FALTA NO SIDEBAR**
- [ ] AgentDetailPage.tsx → `/agents/:id` - **FALTA NO SIDEBAR**
- [ ] AgentTestPage.tsx → `/agents/:id/test` - **FALTA NO SIDEBAR**

### automation/
- [ ] AutoMessagesPage.tsx → ??? - **NÃO ENCONTRADO NO SIDEBAR**
- [ ] CompanyProfileDetailPage.tsx → `/automation/companies/:id` - **FALTA NO SIDEBAR**

### delivery/
- [ ] DeliveryZonesPage.tsx → ??? - **NÃO ENCONTRADO NO SIDEBAR**

### instagram/
- [ ] InstagramDashboardPage.tsx → ??? - **NÃO ENCONTRADO NO SIDEBAR**

### marketing/
- [ ] NewCampaignPage.tsx → `/marketing/email/campaigns/new` - **FALTA NO SIDEBAR**
- [ ] NewWhatsAppCampaignPage.tsx → `/marketing/whatsapp/campaigns/new` - **FALTA NO SIDEBAR**

### messages/
- [ ] MessagesPage.tsx → ??? - **NÃO ENCONTRADO NO SIDEBAR** (duplicado com Conversations?)

### orders/
- [ ] OrderDetailPageNew.tsx → `/stores/:slug/orders/:id` - **FALTA NO SIDEBAR**

### products/
- [ ] ProductsPageNew.tsx → JÁ LISTADO

### settings/
- [ ] SettingsPage.tsx → `/settings` - **NÃO ENCONTRADO NO SIDEBAR**

### stores/
- [ ] StoreDetailPage.tsx → `/stores/:id` - **FALTA NO SIDEBAR**

## 🔍 ANÁLISE DE IMPACTO

### Páginas Críticas Faltando no Sidebar:

1. **AccountDetailPage** - Detalhe da conta WhatsApp
   - **Ação:** Adicionar submenu "Ver Detalhes" em WhatsApp > Contas
   - **Rota:** `/accounts/:id`

2. **AccountFormPage** - Criar/Editar conta
   - **Ação:** Já é acessível via botão "Nova Conta", mas poderia ter link direto
   - **Rota:** `/accounts/new`, `/accounts/:id/edit`

3. **AgentCreatePage/AgentDetailPage/AgentTestPage** - Gestão de agentes
   - **Ação:** Adicionar submenu em Agentes IA
   - **Rotas:** `/agents/new`, `/agents/:id`, `/agents/:id/test`

4. **OrderDetailPageNew** - Detalhe do pedido
   - **Ação:** Acessível via clique na tabela de pedidos
   - **Rota:** `/stores/:slug/orders/:id`

5. **SettingsPage** - Configurações gerais
   - **Ação:** Adicionar no sidebar em "Lojas" ou criar seção "Sistema"
   - **Rota:** `/settings`

6. **StoreDetailPage** - Detalhe da loja
   - **Ação:** Acessível via clique em "Todas Lojas"
   - **Rota:** `/stores/:id`

### Páginas Legadas/Possivelmente Obsoletas:

1. **MessagesPage** - Parece duplicado com ConversationsPage
   - **Verificar:** Se é usado em algum lugar

2. **AutoMessagesPage** - Não encontrado no sidebar
   - **Verificar:** Se foi substituído por outra funcionalidade

3. **DeliveryZonesPage** - Não encontrado no sidebar
   - **Verificar:** Se é usado em configurações de loja

4. **InstagramDashboardPage** - Não encontrado no sidebar
   - **Verificar:** Se é necessário ou foi substituído

## 📝 RECOMENDAÇÕES

### 1. Adicionar ao Sidebar (Alta Prioridade):
```typescript
// Em Agentes IA
children: [
  { name: 'Lista de Agentes', href: '/agents', icon: CpuChipIcon },
  { name: 'Novo Agente', href: '/agents/new', icon: PlusIcon },  // NOVO
  { name: 'Testar Orquestrador', href: '/agents/test/orchestrator', icon: SparklesIcon },
]

// Em Lojas
children: [
  { name: 'Todas Lojas', href: '/stores', icon: BuildingStorefrontIcon },
  { name: 'Nova Loja', href: '/stores/new', icon: PlusIcon },  // NOVO
  { name: 'Configurações', href: storeHref('settings'), icon: Cog6ToothIcon },
  { name: 'Configurações Gerais', href: '/settings', icon: Cog6ToothIcon },  // NOVO
]

// Nova seção ou em Lojas
{ name: 'Entregas', href: '/delivery/zones', icon: TruckIcon },  // NOVO
```

### 2. Verificar Páginas Legadas:
- MessagesPage vs ConversationsPage - Qual usar?
- AutoMessagesPage - Ainda necessário?
- InstagramDashboardPage - Substituído por InstagramInbox?

### 3. Consolidar Rotas:
- `/reports` e `/automation/reports` - São a mesma página?
- Analytics em múltiplos lugares - Consolidar?
