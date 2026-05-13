# pastita-dash — UI Revamp Full Design Spec
**Data:** 2026-05-13  
**Escopo:** Todas as páginas da navbar + debug/diagnóstico  
**Direção visual:** Premium Dark — wine/bordeaux `#722F37`, dark background `#0D0907`, tipografia Inter + Playfair Display  

---

## 1. Princípios globais

### Design System
Todas as páginas devem usar **exclusivamente** os tokens do design system em vez de cores Tailwind hardcoded:

| Token CSS var | Uso |
|---|---|
| `bg-[var(--bg-primary)]` / `dark:bg-[var(--dark-bg-primary)]` | Fundo de página |
| `bg-[var(--bg-card)]` / `dark:bg-[var(--dark-bg-card)]` | Cards e painéis |
| `bg-[var(--bg-hover)]` / `dark:bg-[var(--dark-bg-hover)]` | Hover states |
| `text-[var(--fg-primary)]` / `dark:text-[var(--dark-text-primary)]` | Texto principal |
| `text-[var(--fg-secondary)]` / `dark:text-[var(--dark-text-secondary)]` | Texto secundário |
| `border-[var(--border-default)]` / `dark:border-[var(--dark-border)]` | Bordas |
| `bg-primary-600 hover:bg-primary-700` | Botões primários (já usa CSS var internamente) |

**Regra:** Nenhum `dark:bg-zinc-*`, `dark:text-zinc-*`, `dark:border-zinc-*` direto em páginas. Usar os tokens.

### Animações disponíveis (já em tailwind.config.js)
- `animate-fade-in`, `animate-fade-up`, `animate-slide-in-right`
- `animate-scale-in`, `animate-pulse-soft`, `animate-shimmer`
- Usar `animate-fade-up` em cards ao montar e `animate-shimmer` em skeletons de loading.

### Loading states
Substituir todos os `<div>Carregando...</div>` por skeleton shimmer usando `animate-shimmer bg-gradient-to-r from-bg-card via-bg-hover to-bg-card`.

### Empty states
Toda página com lista vazia deve ter: ícone grande (lucide ou heroicons), título, subtítulo descritivo, botão de ação quando aplicável.

---

## 2. WhatsApp Chat — Redesign Profundo (Tier 1)

**Arquivo principal:** `src/components/chat/ChatWindow.tsx`  
**Página:** `src/pages/whatsapp/WhatsAppChatPage.tsx`  
**CSS a remover:** import de `WhatsAppInbox.css` → migrar tudo para Tailwind

### 2.1 Layout — 3 painéis

```
┌────────────────────────────────────────────────────────────────────┐
│ Painel Esquerdo (w-80)  │  Chat (flex-1)    │  Painel Direito (w-72, opcional) │
│ ─────────────────────── │  ──────────────── │  ──────────────────────────────  │
│ Header: título + FAB +  │  Header: avatar,  │  Tabs: Info / Templates /        │
│ search + filter chips   │  nome, modo,      │  Ferramentas                     │
│                         │  botões painel    │                                  │
│ Lista de conversas      │  Área mensagens   │  (fecha com X)                   │
│                         │  Input            │                                  │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Painel Esquerdo

**Header:**
- Título "WhatsApp" (ou accountName) em `font-display` (Playfair)
- Botão FAB `+` no canto direito → abre `NewConversationModal`
- Search input com ícone (já existe, manter)
- Filter chips abaixo: `Todos` | `Não lidos` | `Humano` | `Bot`
  - Estado: `filter: 'all' | 'unread' | 'human' | 'bot'` (client-side, sem nova chamada API)
  - Chip ativo: `bg-primary-600 text-white`, inativo: `bg-bg-hover text-fg-secondary`

**Cada item de conversa:**
- Avatar 40px: `profile_picture` se disponível, senão initials coloridos (cor determinística por hash do nome)
  - Badge de modo: dot 8px no canto inferior direito do avatar — verde=humano, zinc=bot
- Nome + preview (já existe)
- Timestamp relativo direita: `format(last_message_at)` → "14:32", "Ontem", "Seg" (date-fns ptBR)
- Badge unread: pill `bg-primary-600 text-white text-[10px]` se `unread_count > 0`
- Item ativo: `bg-primary-50 dark:bg-primary-950/30 border-l-2 border-primary-600`

### 2.3 Painel de Chat

**Header:**
- Avatar 36px do contato (clicável → abre painel direito tab Info)
- Nome em negrito + telefone em `text-fg-secondary`
- Status "digitando..." com animação quando `typingContacts.has(conv.id)`
- Pill modo: `🤖 Bot` / `👤 Humano` — click para toggle (substitui os dois botões atuais)
- Ícones direita: `Info` (person icon), `Templates` (doc icon), `Ferramentas` (bolt icon) — cada um abre painel direito na tab correspondente

**Área de mensagens:**
- Fundo: `bg-[#f0ebe3] dark:bg-[#0d0907]` (tom quente, como WhatsApp Web)
- Date separators: já implementados, estilizar com `bg-bg-card/80 backdrop-blur-sm rounded-full text-xs`
- Typing indicator (quando `typingContacts.has(selectedConversation.id)`): bolha inbound com 3 dots CSS animation
  ```css
  /* 3 dots jumping: use Tailwind @keyframes já definido ou inline style */
  ```

**MessageInput:**
- Já usa `MessageInput.tsx` — manter
- Borda superior: `border-t border-[var(--border-default)]`

### 2.4 Painel Direito — `ContactInfoPanel.tsx` (novo componente)

**Props:**
```ts
interface ContactInfoPanelProps {
  conversation: Conversation;
  accountId: string;
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
  store?: Store;
  activeTab: 'info' | 'templates' | 'tools';
  onTabChange: (tab: 'info' | 'templates' | 'tools') => void;
  onClose: () => void;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend: () => void;
}
```

**Tab Info:**
- Avatar grande (64px) + nome + telefone com botão copiar (clipboard API)
- Status mode badge
- Seção "Último pedido" (se storeId → chama `storesApi.getCustomerOrders` limitado a 1)
- Campo "Nota rápida" — `textarea` que salva em `localStorage` com key `conv-note-${conv.id}`
- Link "Ver no CRM" → `/stores/${storeId}/customers?phone=${conv.phone_number}`

**Tab Templates + Tab Ferramentas:**
- Renderiza `<ChatToolsPanel>` com `defaultTab` correto (reutiliza componente existente)

**`ChatToolsPanel.tsx`** — não excluir, apenas passa a ser renderizado dentro do `ContactInfoPanel`.

### 2.5 `NewConversationModal.tsx` (novo componente)

**Fluxo:**
1. Input de telefone com formatação automática `(XX) XXXXX-XXXX`
2. Validação: mínimo 10 dígitos, apenas números
3. Select de template (carrega via `whatsappService.getTemplates(accountId)` — já existe)
4. Preview do template selecionado (renderiza variáveis como `{{1}}` destacadas)
5. Campos para preencher variáveis se o template tiver
6. Botão "Enviar" → chama `whatsappService.sendTemplate(...)` → fecha modal → seleciona conversa criada

**Erro:** se número já tem conversa ativa, apenas seleciona essa conversa no painel.

### 2.6 Estado refatorado em `ChatWindow.tsx`

```ts
// Remove: activePanel: 'templates' | 'tools' | null
// Adiciona:
const [rightPanel, setRightPanel] = useState<'info' | 'templates' | 'tools' | null>(null);
const [showNewConvModal, setShowNewConvModal] = useState(false);
const [filter, setFilter] = useState<'all' | 'unread' | 'human' | 'bot'>('all');
```

Filtragem:
```ts
const filteredConversations = conversations.filter(conv => {
  if (filter === 'unread') return (conv.unread_count ?? 0) > 0;
  if (filter === 'human') return conv.mode === 'human';
  if (filter === 'bot') return conv.mode !== 'human';
  return true;
});
```

### 2.7 Migração CSS → Tailwind

`WhatsAppInbox.css` (1265 linhas) é importado por **4 arquivos**: `ChatWindow.tsx`, `WhatsAppInboxPage.tsx`, `InstagramInbox.tsx`, `MessengerInbox.tsx`. O arquivo só pode ser deletado quando todos os 4 migrarem. A estratégia:

- **Tier 1 (ChatWindow.tsx):** migra completamente para Tailwind e remove o import
- **Tier 3 (WhatsAppInboxPage, InstagramInbox, MessengerInbox):** migram durante o passo de consistency pass; quando o último migrar, deletar `WhatsAppInbox.css`

As classes CSS customizadas mapeiam para:

| Classe CSS atual | Tailwind equivalente |
|---|---|
| `.whatsapp-inbox` | `flex h-[calc(100vh-56px)]` |
| `.conversations-panel` | `w-80 flex-shrink-0 flex flex-col border-r border-[var(--border-default)]` |
| `.chat-panel` | `flex-1 flex flex-col min-w-0` |
| `.chat-tools-panel` | movido para `ContactInfoPanel` |
| `.conversations-header` | `p-4 border-b border-[var(--border-default)]` |
| `.messages-container` | `flex-1 overflow-y-auto p-4` |

---

## 3. Dashboard — Refresh Tier 2

**Arquivo:** `src/pages/dashboard/DashboardPage.tsx`

### Mudanças

**Dark mode tokens:** substituir `dark:bg-zinc-950`, `dark:border-zinc-800` pelos tokens CSS var.

**KPI Cards:** adicionar `delta` prop — percentual de variação vs período anterior (ex: "+12% vs ontem"). Renderizar com seta ↑ verde / ↓ vermelha e texto `text-[10px]`.

**Pipeline:** substituir as `div` com `bg-yellow-500` etc. por um `<BarChart>` horizontal do Recharts (já instalado no projeto via recharts). Dados: `{ name, count, revenue }` por status. Cores usando as CSS vars de primary.

**Tabela de pedidos recentes:** já está bem estruturada. Apenas aplicar tokens de dark mode.

**Project health grid:** manter estrutura, corrigir tokens de cor.

---

## 4. Pedidos (Kanban) — Refresh Tier 2

**Arquivo:** `src/pages/orders/OrdersPage.tsx`

### Mudanças

**Cards do Kanban:**
- Timer de urgência mais visível: quando `critical` (≥40min), o card inteiro tem `ring-2 ring-red-500 animate-pulse-soft`
- Status badge: usar o mesmo padrão de `STATUS_COLOR` do `CustomersPage` (já consistente)
- Nome do cliente em destaque no topo do card, valor em `font-mono font-bold`

**Colunas:**
- Header da coluna com contagem badge: `{column.label} · {count}`
- Fundo da coluna: `bg-bg-hover/50 dark:bg-bg-hover/30` (token, não hardcoded)

**OrderDetailPage e OrderNewPage:**
- Corrigir tokens dark mode (mesma passagem de `zinc-*` → CSS vars)

---

## 5. Clientes (CRM) — Refresh Tier 2

**Arquivo:** `src/pages/customers/CustomersPage.tsx`

### Mudanças

**Lista:**
- Avatar initials 40px com cor determinística por hash do nome (mesma função do ChatWindow)
- LTV como badge verde se > R$500: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`
- Coluna "Última compra" com `formatDistanceToNow` (já importado)

**Modal de detalhe:**
- Layout 2 colunas: esquerda dados pessoais, direita últimos 3 pedidos
- Botão "Iniciar conversa WhatsApp" → navega para `/whatsapp/chat?phone=XXXXXXXXXXX` (query param, ChatWindow lê `useSearchParams` e pré-seleciona ou cria conversa)

---

## 6. Produtos — Refresh Tier 2

**Arquivo:** `src/pages/products/ProductsPageNew.tsx`

### Mudanças
- Dark mode tokens (`zinc-*` → CSS vars)
- Grid view: imagens com `object-cover` e aspect-ratio 1:1, placeholder icon quando sem imagem
- Nenhuma mudança funcional (página já está bem implementada)

**CombosPage.tsx:** mesma passagem de tokens.

---

## 7. Conversas Unificadas — Refresh Tier 2

**Arquivo:** `src/pages/conversations/ConversationsPage.tsx`

### Mudanças
- Visual consistency com o novo ChatWindow (mesmo estilo de item de conversa, badges, avatars)
- Dark mode tokens
- Filter chips: Todos / WhatsApp / Instagram / Messenger (já tem canais diferentes)

---

## 8. Marketing — Consistency Pass (Tier 3)

**Arquivos:** `WhatsAppCampaignsPage`, `NewWhatsAppCampaignPage`, `CampaignsListPage`, `NewCampaignPage`, `SubscribersPage`, `AutomationsPage`, `MarketingPage`, `WhatsAppTemplatesPage`

### Mudanças
- Page headers com `<PageTitle>` component (se existir) ou `<h1 className="font-display text-2xl font-bold">`
- Cards com `bg-[var(--bg-card)] border border-[var(--border-default)]`
- Tabelas: `hover:bg-[var(--bg-hover)]` em linhas
- Status badges usando classes reutilizáveis (extrair `STATUS_COLOR` para util)
- Dark mode tokens (`zinc-*` → CSS vars)

---

## 9. Agentes IA — Consistency Pass (Tier 3)

**Arquivos:** `AgentsPage`, `AgentDetailPage`, `AgentCreatePage`, `AgentTestPage`, `CompanyProfilesPage`, `CompanyProfileDetailPage`, `AutoMessagesPage`, `CustomerSessionsPage`, `AutomationLogsPage`, `ScheduledMessagesPage`, `IntentStatsPage`, `IntentLogsPage`, `AgentFlowsPage`, `ReportsPage`, `UnifiedOrchestratorTest`

### Mudanças
- Agent cards: status online/offline como dot colorido
- `AgentCreatePage` (89 linhas) e `AgentTestPage` (106 linhas) — páginas pequenas/form simples; aplicar dark mode tokens e page header consistente
- Dark mode tokens
- Page headers consistentes
- Empty states com ícone + texto descritivo

---

## 10. Configurações — Consistency Pass (Tier 3)

**Arquivos:** `AccountsPage`, `AccountDetailPage`, `AccountFormPage`, `StoresPage`, `StoreDetailPage`, `StoreSettingsPage`, `SettingsPage`, `PaymentsPage`, `DeliveryZonesPage`, `MessengerAccounts`, `InstagramAccountsPage`, `ConnectionsPage`

### Mudanças
- Form layouts: `label + input` com spacing consistente
- `AccountFormPage` e `AccountDetailPage`: dark mode tokens
- `SettingsPage`: layout de seções com `divide-y divide-[var(--border-default)]`
- Dark mode tokens (`zinc-*` → CSS vars)

---

## 11. WhatsApp Inbox + Instagram + Messenger + Handover + Debug (Tier 3 + Debug)

**WhatsAppInboxPage** (`/whatsapp/inbox`): o usuário usa `/whatsapp/chat`, mas essa página deve receber:
- Dark mode tokens
- Trocar o `<form>` + `<input>` básico (linhas 388-404) pelo `<MessageInput>` component

**InstagramInbox** (680 linhas): dark mode tokens + consistency com ChatWindow

**MessengerInbox** (364 linhas): dark mode tokens

**HandoverRequestsPage** (172 linhas): dark mode tokens + empty state

**Debug/diagnóstico** (`WebhookDiagnosticsPage`, `DebugDashboardPage`, `AgentDebugPage`):
- Dark mode tokens
- Nenhuma mudança funcional

---

## 12. Arquivos compartilhados a criar/atualizar

### `src/utils/avatar.ts` (novo)
Função `getAvatarColor(name: string): string` — retorna uma cor de fundo (hex) determinística usando `charCode sum % palette.length` sobre uma paleta de 8 cores. Função `getInitials(name, phone)` (extraída de ChatWindow). Usado em ChatWindow, CustomersPage, ConversationsPage.

### `src/utils/statusColors.ts` (novo)
Constante `ORDER_STATUS_COLOR` (extraída de CustomersPage) + `CONVERSATION_STATUS_COLOR`. Elimina duplicação entre páginas.

### `src/components/common/SkeletonLoader.tsx` (novo)
`<SkeletonLoader lines={n} />` — linhas shimmer para loading states.

### `src/components/chat/ContactInfoPanel.tsx` (novo)
Descrito na seção 2.4.

### `src/components/chat/NewConversationModal.tsx` (novo)
Descrito na seção 2.5.

---

## 13. Arquivos a remover

- `src/pages/whatsapp/WhatsAppInbox.css` — após migração do ChatWindow para Tailwind
- `src/components/layout/Sidebar.tsx` — componente morto, nunca importado no MainLayout (verificar com `grep -rn Sidebar src/` antes de deletar)

---

## 14. Ordem de implementação

1. **Fundação** — `avatar.ts`, `statusColors.ts`, `SkeletonLoader.tsx` (sem risco, sem quebra)
2. **WhatsApp Chat** — `ChatWindow.tsx` refactor + `ContactInfoPanel.tsx` + `NewConversationModal.tsx` + delete `WhatsAppInbox.css`
3. **Dashboard** — KPIs + Recharts pipeline
4. **Pedidos** — Kanban cards + urgency
5. **Clientes** — lista + modal
6. **Produtos + Combos** — tokens only
7. **Conversas** — consistency
8. **Marketing** (todos os arquivos) — tokens + headers
9. **Agentes IA** (todos os arquivos) — tokens + agent cards
10. **Config** (todos os arquivos) — tokens + forms
11. **WA Inbox + Instagram + Messenger + Handover** — tokens + MessageInput fix
12. **Debug pages** — tokens only
