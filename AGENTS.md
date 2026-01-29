# 🍝 Pastita Dashboard - Análise Técnica

## 📁 Arquitetura do Projeto

```
pastita-dash/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   │   ├── common/     # Button, Card, Modal, Input, etc.
│   │   ├── layout/     # Sidebar, Header, Layout
│   │   └── orders/     # OrdersKanban, OrderCard, etc.
│   ├── pages/          # Páginas da aplicação
│   ├── services/       # APIs e serviços
│   ├── hooks/          # Custom hooks
│   ├── context/        # React Contexts (Store, Auth, WebSocket)
│   └── types/          # TypeScript types
├── tailwind.config.js  # Configuração do Tailwind
└── vite.config.ts      # Configuração do Vite
```

## 🔌 APIs Conectadas

### Server (Backend Django)
- **Base URL**: `/api/v1/`
- **Auth**: JWT Token (httpOnly cookie)

### Endpoints Principais:
| Endpoint | Status | Descrição |
|----------|--------|-----------|
| `/stores/orders/` | ✅ Funcional | CRUD de pedidos |
| `/stores/products/` | ✅ Funcional | CRUD de produtos |
| `/stores/categories/` | ✅ Funcional | Categorias |
| `/stores/coupons/` | ✅ Funcional | Cupons de desconto |
| `/stores/delivery-zones/` | ⚠️ Legado | Zonas de entrega (não usado no checkout) |
| `/stores/customers/` | ✅ Funcional | Clientes |
| `/stores/reports/` | ✅ Funcional | Relatórios e analytics |
| `/marketing/` | ✅ Funcional | Email marketing |
| `/whatsapp/` | ✅ Funcional | Contas WhatsApp |
| `/conversations/` | ✅ Funcional | Conversas |
| `/langflow/` | ✅ Funcional | Flows de IA |

## 📊 Status das Páginas

### ✅ FUNCIONAIS
| Página | Rota | Observações |
|--------|------|-------------|
| Dashboard | `/` | Conectado ao `/stores/reports/dashboard/` |
| Pedidos (Kanban) | `/orders` | ✅ Optimistic UI funcionando |
| Produtos | `/products` | CRUD completo |
| Cupons | `/coupons` | CRUD completo |
| Conversas | `/conversations` | WebSocket funcional |
| Mensagens | `/messages` | Lista de mensagens |
| Contas WhatsApp | `/accounts` | Gerenciamento de contas |
| Marketing | `/marketing` | Dashboard de marketing |
| Email Campanhas | `/marketing/email` | Criar/enviar campanhas |
| Contatos | `/marketing/subscribers` | Lista de contatos |
| Automações | `/marketing/automations` | Email automations |
| Relatórios | `/analytics` | Gráficos e métricas |
| Lojas | `/stores` | Multi-tenant |
| Langflow | `/langflow` | Integração IA |
| Configurações | `/settings` | Settings da conta |

### ⚠️ LEGADAS / PARA REMOVER
| Página | Rota | Motivo |
|--------|------|--------|
| Zonas de Entrega | `/delivery-zones` | Entrega calculada por script/CEP no checkout |

### 🔧 DUPLICADAS (CONSOLIDAR)
| Páginas | Manter | Remover |
|---------|--------|---------|
| `ProductsPage.tsx` vs `ProductsPageNew.tsx` | ProductsPageNew | ProductsPage |
| `OrderDetailPage.tsx` vs `OrderDetailPageNew.tsx` | OrderDetailPageNew | OrderDetailPage |

## 🎨 Design System

### Cores da Marca (Marsala)
```css
--marsala-50: #F9F2F3;
--marsala-500: #B4646E;
--marsala-700: #722F37; /* Primary */
--marsala-900: #2D1215;
```

### Componentes Base
- `Button` - Botões com variantes (primary, secondary, danger)
- `Card` - Cards com sombras e bordas
- `Modal` - Modais responsivos
- `Input` - Inputs estilizados
- `Badge` - Status badges
- `Table` - Tabelas com ordenação

## 🐛 Bugs Conhecidos (Resolvidos)

### ✅ Kanban Drag & Drop
**Problema**: Pedido voltava ao status anterior após drag
**Solução**: Implementado `localOrderStates` com precedência sobre dados externos

```typescript
// Estado local tem precedência até external sincronizar
const effectiveOrders = useMemo(() => {
  return externalOrders.map(order => {
    const localState = localOrderStates.get(order.id);
    if (localState && (localState.isPending || localState.isConfirmed)) {
      return { ...order, status: localState.status };
    }
    return order;
  });
}, [externalOrders, localOrderStates]);
```

## 💡 Melhorias Sugeridas

### Curto Prazo
1. [ ] Remover página "Zonas de Entrega" do menu
2. [ ] Consolidar ProductsPage → ProductsPageNew
3. [ ] Consolidar OrderDetailPage → OrderDetailPageNew
4. [ ] Adicionar loading skeletons nas páginas

### Médio Prazo
1. [ ] Dark mode completo
2. [ ] PWA com notificações push
3. [ ] Dashboard customizável (widgets drag & drop)
4. [ ] Filtros avançados em todas as listagens

### Longo Prazo
1. [ ] App mobile (React Native)
2. [ ] Multi-idioma (i18n)
3. [ ] A/B testing integrado
4. [ ] Analytics avançado com funis

## 🔐 Autenticação

- Login via `/auth/login/`
- Token JWT em httpOnly cookie
- Refresh automático
- Context: `useAuth()` hook

## 📡 WebSocket

- Conexão única global via `WebSocketContext`
- Eventos: `order_created`, `order_status_changed`, `payment_received`
- Reconexão automática com backoff

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## 📝 Notas para Desenvolvimento

1. **Store Context**: Sempre usar `useStore()` para obter o storeId atual
2. **API Calls**: Usar services em `src/services/` ao invés de axios direto
3. **Toasts**: Usar `react-hot-toast` para notificações
4. **Icons**: Usar `@heroicons/react` para ícones
5. **Formulários**: Componentes em `src/components/common/`
