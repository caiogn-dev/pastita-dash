# 🎨 MIGRAÇÃO CHAKRA UI v3 - PROGRESSO

## ✅ Páginas Migradas

| Página | Status | Componentes Usados |
|--------|--------|-------------------|
| DashboardPage | ✅ | Card, StatCard, Grid, Charts |
| AccountsPage | ✅ | Card, Table, Menu, Badge, Button |
| LoginPage | ✅ | Card, Input, Button, Stack |
| MainLayout | ✅ | Flex, Box, Sidebar, Header |
| WhatsAppChatPage | ✅ | Box, Heading, ChatWindow |

## 🔄 Páginas Pendentes (43 restantes)

### Prioridade Alta
- [x] OrdersPage ✅ migrado para HTML+Tailwind (Fase 2.3)
- [x] ProductsPageNew ✅ já usava HTML+Tailwind (sem Chakra)
- [ ] ConversationsPage
- [ ] MessagesPage
- [ ] AccountDetailPage
- [ ] AccountFormPage

### Prioridade Média
- [ ] CouponsPage
- [ ] DeliveryZonesPage
- [ ] PaymentsPage
- [ ] SettingsPage
- [ ] StoresPage

### Prioridade Baixa
- [ ] Agentes (4 páginas)
- [ ] Automação (8 páginas)
- [ ] Marketing (7 páginas)
- [ ] Instagram (4 páginas)
- [ ] Messenger (2 páginas)
- [ ] Debug/Reports (3 páginas)

## 🎯 Padrão de Migração

### 1. Imports
```typescript
// Antes
import { Card, Button, Table } from '../../components/common';

// Depois
import { Card, Button } from '../../components/common';
import { Box, Flex, Stack, Grid, Table, Badge } from '@chakra-ui/react';
```

### 2. Layout
```typescript
// Antes
<div className="p-6">
  <div className="flex justify-between">

// Depois
<Box p={6}>
  <Flex justify="space-between">
```

### 3. Cores
```typescript
// Antes
className="text-gray-900 dark:text-white"

// Depois
color="fg.primary"
```

### 4. Estados de Loading
```typescript
// Antes
{isLoading && <PageLoading />}

// Depois
{isLoading ? (
  <Stack gap={3}>
    <Skeleton height="60px" />
  </Stack>
) : (
  // content
)}
```

## 🛠️ Componentes Base Atualizados

- ✅ Card - Com variantes (default, outline, filled)
- ✅ Button - Com colorPalette
- ✅ Input - Com label, error, helperText
- ✅ Badge - Com colorPalette

## 📝 Próximos Passos

1. Migrar páginas de prioridade alta
2. Atualizar componentes de layout (Header, Sidebar)
3. Testar todos os endpoints
4. Verificar responsividade
5. Testar dark/light mode

## 🎨 Design System

### Cores
- Brand: WhatsApp green (#25D366)
- Accent: Blue (#0ea5e9)
- Success: Green (#22c55e)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)

### Tokens Semânticos
- bg.primary / bg.secondary / bg.card
- fg.primary / fg.secondary / fg.muted
- border.primary / border.secondary

### Breakpoints
- base: Mobile
- md: Tablet
- lg: Desktop
