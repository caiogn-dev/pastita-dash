# Camada Mobile do Gestor de Pedidos (PWA) — Design

**Data:** 2026-06-19
**Projeto:** pastita-dash (painel Cardapidex, Vite + React SPA, deploy Vercel)
**Status:** aprovado para planejamento

## Objetivo

Adicionar uma camada de uso **mobile** ao painel do gestor, com cara de app de
verdade, **sem alterar nada do desktop**. Distribuição como **PWA no mesmo
projeto** (instalável via "adicionar à tela inicial", iOS + Android, sem loja).

Regra dura: desktop fica intacto. A camada mobile é puramente aditiva.

## O que já existe (não refazer)

A fundação está pronta — este projeto é majoritariamente UI de apresentação:

- **PWA instalável**: `public/manifest.json` (standalone, ícones, theme
  `#C7492E`), `public/sw.js` com cache offline + Web Push + `notificationclick`
  (focar/abrir aba), SW registrado em `index.html`.
- **Push ponta a ponta**:
  - Front: `src/hooks/usePushNotifications.ts` (VAPID, subscribe/unsubscribe),
    `src/services/notifications.ts`, `PushNotificationToggle`.
  - Back (server2): `apps/notifications` (VAPID, models, service, views) +
    gatilho real `apps/stores/signals.py:90` → `notify_new_order_push.delay(order_id)`
    no commit → Celery → Web Push. **Pedido novo já dispara push.**
- **Pedidos maduros**: `useRealTimeOrders` (WebSocket), `orderSla`,
  `orderColumns`, páginas `OrdersPage*`, `OrderDetailPage`, `OrderNewPage`, KDS.
- **MainLayout já bifurca por contexto** (`isDedicatedOrderRoute`,
  `isFullscreenRoute`) — padrão que vamos seguir.

## Escopo das telas mobile

Três fluxos core (o inbox WhatsApp/Instagram fica de fora desta entrega):

1. **Pedidos em tempo real + mudança de status** (coração do app)
2. **Criar pedido + cadastrar/buscar cliente**
3. **KDS / cozinha**

Demais seções continuam acessíveis via aba "Mais" (abrem as páginas existentes).

## Arquitetura

### Ponto de decisão único

- Novo hook `useIsMobileViewport()` — `matchMedia('(max-width: 767px)')` com
  listener reativo. Fonte única de verdade do "estamos no mobile".

### Bifurcação no layout

- Em `MainLayout.tsx`, **uma** ramificação no topo do componente:
  - se `isMobile && autenticado && !fullscreenRoute` → renderiza `<MobileShell/>`
  - senão → exatamente o layout desktop atual, **sem nenhuma alteração**.
- Segue o padrão de ramificação que já existe no arquivo. Diff no desktop = zero
  linhas alteradas no caminho desktop.

### Shell isolado

- Pasta nova `src/mobile/` contém shell, telas e componentes phone-first.
- `MobileShell` = área de conteúdo (`<Outlet/>` ou render por aba) +
  `<BottomNav/>` fixo embaixo, respeitando `env(safe-area-inset-bottom)` (iOS).
  Sem `Navbar` desktop.
- **Reuso total** de `src/services/`, `src/hooks/`, `src/stores/`, `src/types/`.
  Nenhuma lógica de dados é duplicada — `src/mobile/` é só apresentação.

### Navegação (bottom nav, 4 abas)

```
┌─────────────────────────────┐
│   [conteúdo da aba ativa]    │
│                             │
├──────┬──────┬──────┬────────┤
│Pedidos│ Novo │Cozinha│ Mais  │
└──────┴──────┴──────┴────────┘
```

- **Pedidos** (default): lista ao vivo em **cards** (não tabela), agrupada por
  status, badge de SLA. Toque → detalhe com botões grandes de status. Reusa
  `useRealTimeOrders` + `orderSla`.
- **Novo**: fluxo em passos phone-first — buscar/cadastrar cliente → itens →
  confirmar. Reusa a lógica de criação de `OrderNewPage`; UI mobile nova.
- **Cozinha (KDS)**: fila em coluna única, cards grandes, "marcar pronto" por
  toque. Reusa os dados/serviços do KDS atual.
- **Mais**: lista que navega para as seções restantes (clientes, conversas,
  settings…) usando as páginas existentes — fallback gracioso, sem reconstruir.

## Push & realtime no mobile

- Backend e SW já entregam. No mobile só falta **provocar o opt-in**: banner
  discreto na aba Pedidos no primeiro uso chamando
  `usePushNotifications.subscribe()`. `notificationclick` já leva ao pedido.
- Realtime reusa `useRealTimeOrders` (WebSocket) — pedido novo entra na lista ao
  vivo, e o push cobre o caso do app fechado.

## O que toca / não toca

- **Adiciona**: `src/mobile/*` (shell, BottomNav, 3 telas, componentes),
  `useIsMobileViewport`, 1 bifurcação em `MainLayout.tsx`.
- **Não altera**: nenhum componente, página ou estilo do caminho desktop.

## Testes

- `useIsMobileViewport`: alterna corretamente com mudança de viewport (mock
  `matchMedia`).
- `MainLayout`: renderiza `MobileShell` sob viewport mobile e o layout desktop
  caso contrário; rotas fullscreen continuam fullscreen.
- Smoke das 3 telas reusando mocks de service já existentes: mudar status de um
  pedido, criar pedido com cliente, marcar item pronto no KDS.

## Fora de escopo (YAGNI por agora)

- Inbox WhatsApp/Instagram mobile-nativo (acessível via "Mais").
- App nativo / Capacitor / lojas.
- Modo offline além do que o SW já faz.
- Qualquer mudança no desktop.

## Riscos

- **Deploy Vercel na `main`**: trabalho fica em branch; merge só após validação.
  Erro de TS bloqueia o build — `tsc` verde é gate antes do merge.
- **Regressão desktop**: mitigada pela bifurcação única e pasta isolada; teste
  de layout cobre os dois caminhos.
