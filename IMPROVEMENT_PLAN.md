# 🎨 Pastita Dashboard - Plano de Melhorias

## 📊 Análise do Estado Atual

### ✅ Pontos Fortes
- Design system bem definido com Tailwind CSS customizado
- Cores de marca (Marsala) consistentes
- Dark mode implementado corretamente (preto puro)
- Lazy loading para páginas
- Componentes atômicos bem estruturados (atoms, molecules, organisms)
- WebSocket para real-time
- Zustand para state management
- **NOVO**: Componentes UI modernos (Toast, Dropdown, Glass Morphism)
- **NOVO**: Sidebar com submenus para WhatsApp e Instagram
- **NOVO**: Typography fluida responsiva

### ⚠️ Problemas Identificados

#### 1. **Duplicação de Componentes** ✅ PARCIALMENTE RESOLVIDO
| Localização | Problema | Status |
|-------------|----------|--------|
| `components/atoms/Button.tsx` + `components/common/Button.tsx` | Dois componentes Button | `/ui/button.tsx` criado |
| `components/atoms/Input.tsx` + `components/common/Input.tsx` | Dois componentes Input | `/ui/input.tsx` criado |
| `components/molecules/Card.tsx` + `components/common/Card.tsx` | Dois componentes Card | `/ui/card.tsx` criado |
| `components/molecules/Modal.tsx` + `components/common/Modal.tsx` | Dois componentes Modal | `/ui/modal.tsx` criado |

**Próximo passo**: Migrar imports das páginas para usar `/ui`

#### 2. **Sidebar com Menu Muito Longo** ✅ RESOLVIDO
- ✅ Reorganizado em 4 seções principais
- ✅ Submenus colapsáveis para WhatsApp e Instagram
- ✅ Barra de busca no menu

#### 3. **Falta de Animações Modernas** 🔄 EM PROGRESSO
- ✅ CSS animations básicas implementadas
- ⏳ Framer Motion pendente instalação
- ⏳ Page transitions pendente

#### 4. **Responsividade Inconsistente** ✅ RESOLVIDO
- ✅ Typography fluida com clamp()
- ✅ Spacing system responsivo
- ✅ Glass morphism adaptativo

#### 5. **API Services Fragmentados** ✅ PARCIALMENTE RESOLVIDO
- ~~`pastitaApi.ts` (REMOVIDO)~~ ✅
- ~~`unifiedApi.ts` (REMOVIDO)~~ ✅
- `storeApi.ts` (MANTIDO - único padrão)

---

## 🛠️ Plano de Implementação

### Fase 1: Consolidação de Componentes (P0)

#### 1.1 Criar pasta `components/ui/` unificada
```
components/ui/
├── button.tsx       # Botão com variantes
├── card.tsx         # Card com glass, hover effects
├── input.tsx        # Input com validação visual
├── modal.tsx        # Modal com animations
├── badge.tsx        # Badge com pulse
├── skeleton.tsx     # Skeleton melhorado
├── toast.tsx        # Toast com progress
├── dropdown.tsx     # Dropdown animado
└── index.ts         # Barrel exports
```

#### 1.2 Migração Gradual
1. Criar novos componentes em `/ui`
2. Deprecar `/atoms`, `/molecules`, `/common`
3. Atualizar imports nas páginas

### Fase 2: Melhorias de UI/UX (P1)

#### 2.1 Sidebar Refinada
```tsx
// Nova estrutura
const sections = [
  { title: 'Principal', items: ['Dashboard', 'Pedidos', 'Produtos'] },
  { title: 'Comunicação', items: ['Conversas', 'WhatsApp', 'Instagram'] },
  { title: 'Automação', items: ['Agentes IA', 'Campanhas', 'Relatórios'] },
  { title: 'Configurações', items: ['Lojas', 'Integrações', 'Conta'] },
];
```

#### 2.2 Animações com Framer Motion
```tsx
// Page transition
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  {children}
</motion.div>

// List stagger
<motion.ul>
  {items.map((item, i) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
    />
  ))}
</motion.ul>
```

#### 2.3 Glass Morphism Moderno
```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.dark .glass-card {
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Fase 3: Responsividade (P1)

#### 3.1 Typography Fluida
```css
:root {
  --font-size-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --font-size-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --font-size-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --font-size-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --font-size-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
}
```

#### 3.2 Spacing System
```css
:root {
  --space-1: clamp(0.25rem, 0.2rem + 0.25vw, 0.375rem);
  --space-2: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-4: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-6: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  --space-8: clamp(2rem, 1.6rem + 2vw, 3rem);
}
```

### Fase 4: Performance (P2)

#### 4.1 Code Splitting Aprimorado
- Lazy load por feature (não por página)
- Prefetch de rotas adjacentes
- Service worker para cache

#### 4.2 Image Optimization
- WebP/AVIF com fallback
- Lazy loading nativo
- Blur placeholder

---

## 📁 Nova Estrutura Proposta

```
src/
├── components/
│   ├── ui/              # Componentes base (shadcn-style)
│   ├── layout/          # Header, Sidebar, MainLayout
│   ├── features/        # Componentes de domínio
│   │   ├── orders/
│   │   ├── products/
│   │   ├── conversations/
│   │   └── automation/
│   └── shared/          # Componentes compartilhados
├── hooks/               # Custom hooks
├── lib/                 # Utilities, helpers
├── services/            # API services (consolidado)
├── stores/              # Zustand stores
├── styles/              # CSS global
├── types/               # TypeScript types
└── pages/               # Páginas (lazy loaded)
```

---

## 🎯 Checklist de Implementação

### ✅ Completado (Sprint Atual)
- [x] Remover `pastitaApi.ts` e `unifiedApi.ts`
- [x] Criar componentes base em `/ui` (Button, Card, Input, Modal, Badge, Skeleton, Toast, Dropdown)
- [x] Refinar Sidebar com submenus para WhatsApp e Instagram
- [x] Melhorar responsividade com Typography fluida (clamp())
- [x] Adicionar Glass Morphism CSS moderno
- [x] Criar página dedicada WhatsApp Chat (`/whatsapp/chat`)

### 🔄 Em Progresso (Próxima Sprint)
- [ ] Adicionar Framer Motion para animações
- [ ] Implementar page transitions com AnimatePresence
- [ ] Migrar todos os componentes para `/ui`
- [ ] Adicionar skeleton loading em todas páginas
- [ ] Virtual scrolling para listas de pedidos/produtos

### 📋 Backlog (Próximas Sprints)

#### Sprint 3 - Sistema de Notificações
- [ ] **NotificationCenter**: Componente de central de notificações
- [ ] **Push Notifications**: Integração com Web Push API
- [ ] **Sound Alerts**: Sons customizáveis por tipo de evento
- [ ] **Badge Counter**: Indicador no header com contagem

#### Sprint 4 - Analytics Avançado
- [ ] **Dashboard Interativo**: Gráficos com drill-down (Recharts)
- [ ] **Filtros Avançados**: Período customizável, comparação MoM/YoY
- [ ] **Export Reports**: PDF e Excel com react-pdf e xlsx
- [ ] **KPIs em Tempo Real**: Métricas atualizadas via WebSocket

#### Sprint 5 - Kanban de Pedidos
- [ ] **Drag & Drop**: Arrastar pedidos entre colunas de status
- [ ] **Timeline View**: Visualização da jornada do pedido
- [ ] **Print Labels**: Impressão de etiquetas/comandas
- [ ] **Bulk Actions**: Ações em lote (marcar como entregue, etc.)

#### Sprint 6 - PWA & Performance
- [ ] **Service Worker**: Cache offline para dados críticos
- [ ] **Install Prompt**: Banner de instalação customizado
- [ ] **Background Sync**: Sincronização quando voltar online
- [ ] **Bundle Optimization**: Code splitting por feature

#### Sprint 7 - Integração com IA
- [ ] **Smart Replies**: Sugestões de respostas automáticas
- [ ] **Sentiment Analysis**: Análise de sentimento em conversas
- [ ] **Demand Forecast**: Previsão de demanda de produtos
- [ ] **Chatbot Builder**: Interface visual para criar fluxos

### 🚀 Futuro (Roadmap)
- [ ] **i18n**: Suporte a português/inglês/espanhol
- [ ] **White-label**: Temas customizáveis por store
- [ ] **Mobile App**: React Native com código compartilhado
- [ ] **Marketplace**: Integração com iFood/Rappi
- [ ] **Loyalty Program**: Sistema de pontos e recompensas

---

## 🆕 Novas Features Planejadas

### 1. 📱 Sistema de Notificações em Tempo Real
```
components/notifications/
├── NotificationCenter.tsx    # Central de notificações
├── NotificationItem.tsx      # Item individual
├── NotificationBell.tsx      # Ícone com badge no header
├── useNotifications.ts       # Hook para gerenciar notificações
└── notificationStore.ts      # Zustand store
```

**Tipos de Notificações:**
- 🛒 Novo pedido recebido
- 💬 Nova mensagem WhatsApp/Instagram
- 💳 Pagamento confirmado
- 🚚 Pedido saiu para entrega
- ⚠️ Estoque baixo
- 🤖 Ação do agente IA

### 2. 📊 Dashboard Analytics v2
```tsx
// Componentes planejados
<AnalyticsDashboard>
  <MetricCard metric="revenue" comparison="mom" />
  <SalesChart period="7d" groupBy="day" />
  <TopProducts limit={10} />
  <CustomerRetention />
  <HeatmapOrders /> // Pedidos por hora/dia
</AnalyticsDashboard>
```

### 3. 🎯 Kanban de Pedidos Avançado
```tsx
// Estados do Kanban
const orderStages = [
  { id: 'pending', label: 'Pendentes', color: 'yellow' },
  { id: 'confirmed', label: 'Confirmados', color: 'blue' },
  { id: 'preparing', label: 'Preparando', color: 'orange' },
  { id: 'ready', label: 'Pronto', color: 'green' },
  { id: 'delivering', label: 'Em Entrega', color: 'purple' },
  { id: 'delivered', label: 'Entregue', color: 'gray' },
];
```

### 4. 🤖 Integração com Agentes IA
- Painel de conversas gerenciadas por IA
- Métricas de performance do agente
- Treinamento com exemplos de conversas
- Handoff para humano configurável

---

## 📊 Métricas de Sucesso

| Métrica | Atual | Meta Sprint 3 | Meta Final |
|---------|-------|---------------|------------|
| Lighthouse Performance | ~70 | 85 | 95+ |
| First Contentful Paint | ~2s | 1.2s | <0.8s |
| Time to Interactive | ~3s | 2s | <1.5s |
| Bundle Size (gzip) | ~400KB | 300KB | <200KB |
| Component Reusability | 60% | 80% | 95% |
| Test Coverage | 0% | 50% | 80% |

---

## 🔗 Referências de Design

- [Linear App](https://linear.app) - Transições suaves, UI limpa
- [Vercel Dashboard](https://vercel.com) - Dark mode, tipografia
- [Stripe Dashboard](https://dashboard.stripe.com) - Data visualization
- [Notion](https://notion.so) - Sidebar navigation
- [Raycast](https://raycast.com) - Micro-interactions
- [Cal.com](https://cal.com) - Scheduling UI
- [Dub.co](https://dub.co) - Analytics dashboard
