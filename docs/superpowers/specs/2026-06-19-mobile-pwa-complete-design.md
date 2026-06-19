# PWA do Gestor — Completo e Robusto — Design

**Data:** 2026-06-19
**Projeto:** pastita-dash (painel Cardapidex, Vite + React + TS, deploy Vercel)
**Status:** aprovado para planejamento
**Antecede:** `2026-06-19-mobile-order-manager-pwa-design.md` (shell base, já em produção)

## Objetivo

Tornar o shell mobile (PWA) **completo e robusto**: contexto de loja funcionando,
todas as telas com loading/empty/error, detalhe de pedido e itens de cozinha
visíveis, criação de pedido decente, navegação sem becos, e instalação do PWA
(botão + banner). Desktop permanece intacto em comportamento.

Origem: o shell base subiu, mas (a) lojas nunca carregam no mobile → "selecione
uma loja" sem saída; (b) telas dão tela branca silenciosa; (c) sem detalhe de
pedido; (d) cozinha não mostra itens; (e) becos de navegação; (f) sem install.

## Constraints globais

- **Aditivo.** Código novo só em `src/mobile/`. Mudanças fora de `src/mobile/`
  limitadas a: `App.tsx` (bootstrap de lojas), `src/components/layout/StoreSelector.tsx`
  (vira read-only), `src/components/layout/MainLayout.tsx` (rota `/inbox` fullscreen).
  Nenhuma outra mudança de comportamento no desktop.
- **Breakpoint:** `matchMedia('(max-width: 767px)')` (telefone). Tablet fora.
- **Loja ativa:** `useRootStore((s) => s.selectedStoreId)`; lista em `s.stores`.
- **Auth:** `useAuthStore((s) => s.isAuthenticated)` (NÃO a slice auth do rootStore).
- **Reuso:** `storesApi.getStores/getOrders/getOrder/updateOrderStatus`,
  `productsService`, `ordersService`, `useRealTimeOrders`, `usePushNotifications`.
- **Tokens Tailwind semânticos** (`bg-bg-card`, `text-fg-*`, `bg-brand-500`,
  `bg-brand-soft`…). Sem hex cru.
- **Alvos de toque ≥44px.** `env(safe-area-inset-bottom)` respeitado.
- **Sem regressão:** suíte completa só com `ComboForm.test.tsx` falhando (pré-existente).
- Branch `feat/mobile-pwa-complete`. Não dar push na `main` sem aprovação. `tsc` verde.

## Fora de escopo (explícito)

- Redesign mobile do interior das páginas Clientes/Produtos/Config/Conversas —
  ganham header-voltar e ficam usáveis, mas o layout interno segue desktop.
- Pull-to-refresh nativo (usamos botão "Atualizar"), tablet, e telas de
  analytics/agentes/automação/plano no mobile.

---

## Frente 1 — Contexto de loja

### 1.1 Bootstrap global de lojas
**Problema:** `getStores()` só é chamado dentro do `StoreSelector` (desktop, `max-sm:hidden`).
No mobile nunca roda → `stores=[]` → `setStores` (que auto-seleciona `stores[0]`)
nunca dispara → `selectedStoreId` null.

**Solução:** novo hook `useBootstrapStores()` em `src/mobile/` chamado no bootstrap
autenticado do `App.tsx` (onde já carrega `accounts`). Ao ficar autenticado e com
`stores` vazio, chama `storesApi.getStores()` → `useRootStore.getState().setStores(results)`.
Idempotente (só busca se `stores.length === 0`). `setStores` já auto-seleciona
`stores[0]` quando nada válido está selecionado (rootStore existente).

**Sanitização:** `StoreSelector.tsx` deixa de fazer fetch próprio e passa a só ler
`useRootStore(s => s.stores)` + `setSelectedStore`. Fonte única de carregamento.
Desktop continua com o mesmo comportamento visível.

**Estado vazio honesto:** se `getStores` retorna vazio, `selectedStoreId` fica null
e as telas mostram "Nenhuma loja na sua conta" (não "selecione uma loja").

### 1.2 MobileTopBar (novo)
`src/mobile/MobileTopBar.tsx`. Barra sticky no topo do shell:
- Mostra o **nome da loja ativa** (de `stores` + `selectedStoreId`).
- ≥2 lojas: chevron à direita; toque abre `MobileStoreSwitcher`. 1 loja: só o nome.
- Altura ~48px + `env(safe-area-inset-top)` no padding-top.

### 1.3 MobileStoreSwitcher (novo)
`src/mobile/MobileStoreSwitcher.tsx`. Bottom sheet (overlay + painel inferior):
- Lista `stores` com a ativa marcada. Tocar → `setSelectedStore(id)` + fecha.
- Backdrop fecha. `z-index` acima do conteúdo, abaixo de nada crítico.

### 1.4 MobileShell
Adiciona `<MobileTopBar/>` acima do `<main>`. `<main>` ganha
`pt` para a topbar e `pb-[calc(5rem+env(safe-area-inset-bottom))]` para a bottom nav.

---

## Frente 2 — Telas sólidas

### 2.0 Dados compartilhados no shell
**Problema:** Orders e KDS cada um chama `getOrders` e abre seu próprio
`useRealTimeOrders` (2 WebSockets ao mesmo endpoint; fetch duplo).

**Solução:** hook `useStoreOrdersFeed()` em `src/mobile/` que, dado `selectedStoreId`,
faz UMA carga (`getOrders({ store, status__in ativos, page_size: 50 })`) e mantém UM
`useRealTimeOrders`. Expõe `{ orders, loading, error, refetch }`. Chamado uma vez no
`MobileShell` e passado por contexto leve (`MobileOrdersContext`) ou props às telas
Pedidos/Cozinha. Orders e KDS consomem isso em vez de buscar sozinhos.

Filtro de ativos: `status` param aceito por `getOrders` (storesApi). Excluir
`delivered/completed/cancelled/refunded` da carga inicial (live só mostra ativos).

### 2.1 Estados em todas as telas
Cada tela (Pedidos, Cozinha, Novo, e produtos no Novo) trata:
- **loading:** skeleton (`animate-pulse bg-bg-card rounded-xl`, 3–6 cards).
- **error:** mensagem + botão "Tentar novamente" (chama `refetch`).
- **empty:** Pedidos "Nenhum pedido ativo no momento."; Cozinha "Cozinha vazia.";
  Novo/produtos "Nenhum produto ativo cadastrado."
- **success:** conteúdo.

### 2.2 Detalhe do pedido (novo)
`src/mobile/MobileOrderDetailSheet.tsx` (bottom sheet). Tocar num card de Pedidos abre
o sheet com: `order_number`, status, cliente (nome/telefone), método de entrega +
`delivery_address`, itens (`items[]`: nome × qtd, preço, notas), `notes`,
`payment_method`, total, `created_at`. Usa o pedido já em memória; se faltar campo,
`getOrder(id)` para hidratar. Botão de avançar status dentro do sheet também.

### 2.3 Pedidos ao vivo (MobileOrdersScreen)
- Card tocável → abre detalhe (2.2).
- Mostra timestamp relativo ("há 3 min") via `date-fns` `formatDistanceToNow`.
- Moeda pt-BR: `toLocaleString('pt-BR', { minimumFractionDigits: 2 })`.
- Botão avançar `py-3` (≥44px). `advance()` com `catch` → toast de erro.
- Header da tela com título "Pedidos" + nome da loja.

### 2.4 Cozinha (MobileKdsScreen)
- **Lista os itens** de cada pedido (`items[].name × quantity`, + notas). (hoje só `items.length`)
- Mostra cliente + badge de entrega (pickup/delivery) + notas.
- Pula colunas vazias (`if (colOrders.length === 0) return null`).
- `advance()` com `catch` → toast.
- Header "Cozinha".

### 2.5 Novo pedido (MobileNewOrderScreen)
- Itens no carrinho com **+/− e remover**; **total** calculado e exibido (linha + geral).
- Seletor de **método de entrega** (pickup/delivery — segmented) e **pagamento**
  (pix/dinheiro/cartão — radios). Default pickup/dinheiro.
- `type="tel"` no telefone.
- loading/empty de produtos (2.1). `catch` no submit → erro acima do botão.
- Sucesso "Pedido X criado!" some sozinho em ~4s.
- Moeda pt-BR.

---

## Frente 3 — Navegação sem becos

### 3.1 Header-voltar nas páginas via "Mais"
Quando `!isHome`, `MobileShell` injeta `MobilePageHeader` acima do `<Outlet/>`:
barra com chevron-voltar (`navigate('/?tab=mais')`) + título da página (derivado da
rota). Dá saída clara das páginas desktop renderizadas no shell.

### 3.2 Conserto do /inbox
`/inbox` hoje não casa `isFullscreenRoute` → renderiza quebrado no shell.
Adicionar `inbox` ao regex `isFullscreenRoute` em `MainLayout.tsx`
(`/^\/(whatsapp\/(inbox|chat)|conversations|inbox)/`), assim Conversas abre em tela
cheia própria (sem o shell espremer). "Mais" linka `/inbox`.

### 3.3 Guarda de loja na "Mais"
Sem `selectedStoreId`: Clientes e Produtos ficam **desabilitados** com texto
"Selecione uma loja primeiro" (não navegam pra `/stores`). Com loja, linkam
`/stores/${id}/customers` e `/stores/${id}/products`.

### 3.4 "Mais" com ícones + chevron
Cada item com ícone à esquerda (`UserGroupIcon`, `ChatBubbleLeftRightIcon`,
`CubeIcon`, `Cog6ToothIcon`) e `ChevronRightIcon` à direita; estados `active:`/`focus:`.
Header com nome da loja no topo da aba.

---

## Frente 4 — Install + polish

### 4.1 useInstallPrompt (novo)
`src/mobile/useInstallPrompt.ts`. Escuta `beforeinstallprompt` (preventDefault,
guarda o evento), expõe `{ canInstall, promptInstall, isIOS, isStandalone }`.
`promptInstall()` chama `event.prompt()`. `isStandalone` via
`matchMedia('(display-mode: standalone)')` para esconder quando já instalado.

### 4.2 Botão "Instalar app" na aba Mais
Item "Instalar app" na "Mais" que aparece quando `canInstall` (ou iOS não-standalone).
Chrome: chama `promptInstall()`. iOS: abre dica "Compartilhar → Adicionar à Tela de Início".

### 4.3 Banner de install na 1ª vez
`src/mobile/InstallBanner.tsx`: banner dispensável no topo do shell (abaixo da topbar),
mostrado quando `canInstall && !isStandalone && !dismissedPersistido`. Dispensar grava
`localStorage('cdx_install_dismissed')`. iOS sem `beforeinstallprompt`: mostra a dica.

### 4.4 Polish (do audit)
- Push opt-in: dismiss persiste em `localStorage('cdx_push_dismissed')`; mostra
  `error` do hook quando falha.
- Botão dismiss do banner com `p-3` (alvo ≥44px).
- `<main>` com `pb-[calc(5rem+env(safe-area-inset-bottom))]`.

---

## Estrutura de arquivos (novos em src/mobile/)

```
src/mobile/
  useBootstrapStores.ts        # F1.1 — carga global de lojas
  MobileTopBar.tsx             # F1.2
  MobileStoreSwitcher.tsx      # F1.3
  useStoreOrdersFeed.ts        # F2.0 — 1 fetch + 1 WS, {orders,loading,error,refetch}
  MobileOrdersContext.tsx      # F2.0 — provider leve do feed
  MobileOrderDetailSheet.tsx   # F2.2
  MobilePageHeader.tsx         # F3.1 — header-voltar p/ páginas via Outlet
  useInstallPrompt.ts          # F4.1
  InstallBanner.tsx            # F4.3
  ui/Skeleton.tsx              # F2.1 — placeholder reutilizável
  ui/BottomSheet.tsx           # base reutilizável (switcher + detalhe)
  (modificados) MobileShell, BottomNav, screens/*, PushOptInBanner
```

Fora de src/mobile (cirúrgico, testado): `App.tsx` (chamar useBootstrapStores),
`StoreSelector.tsx` (read-only), `MainLayout.tsx` (/inbox fullscreen).

## Testes

- `useBootstrapStores`: autenticado + stores vazio → chama getStores + setStores; não
  refaz se já tem stores; não roda deslogado.
- `StoreSelector`: renderiza a partir de `stores` do store sem fazer fetch; troca chama setSelectedStore.
- `MobileTopBar`: mostra loja ativa; ≥2 lojas abre switcher; 1 loja sem ação.
- `MobileStoreSwitcher`: lista lojas; selecionar chama setSelectedStore + fecha.
- `useStoreOrdersFeed`: 1 fetch por store, expõe loading/error/refetch; erro setado no catch.
- Screens: cada uma renderiza loading→success, empty e error+retry; Orders abre detalhe
  ao tocar; KDS lista itens; Novo soma total, +/−/remove, submit com erro mostra mensagem.
- `MobileOrderDetailSheet`: mostra itens/cliente/endereço/pagamento; avançar status chama updateOrderStatus.
- `MobilePageHeader`: voltar navega para `/?tab=mais`.
- `useInstallPrompt`: captura beforeinstallprompt; promptInstall dispara; isStandalone detecta.
- `InstallBanner` + `PushOptInBanner`: aparecem conforme flags; dismiss persiste em localStorage.
- `MainLayout`: `/inbox` cai em fullscreen (não no shell) no mobile.

## Riscos

- **Deploy Vercel na main:** trabalho em branch; merge só após validação; `tsc` é gate.
- **Toque no desktop (App.tsx, StoreSelector, MainLayout):** mudanças pequenas e
  testadas; StoreSelector read-only validado por teste; regressão coberta pela suíte.
- **Páginas desktop no shell:** ficam usáveis com header-voltar, não redesenhadas
  (escopo). Documentado como limitação consciente.
