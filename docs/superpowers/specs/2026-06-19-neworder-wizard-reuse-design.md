# Novo Pedido — Wizard único reutilizável (desktop + mobile) + fix da rota — Design

**Data:** 2026-06-19
**Projeto:** pastita-dash (painel Cardapidex)
**Status:** aprovado para planejamento

## Objetivo

Unificar a criação de pedido num **único wizard de qualidade**, extraído do
`NewOrderDrawer` (que já é um wizard de 5 etapas com cálculo de rota), e
**reutilizá-lo no mobile** (a aba "Novo"). De quebra, **corrigir** o cálculo de
rota/taxa de entrega no painel, que hoje quebra por passar o UUID da loja em vez
do slug.

Problema atual:
- O `NewOrderDrawer` (desktop) é um bom wizard 5-etapas com busca de cliente
  (CRM), cálculo de taxa de entrega, desconto/acréscimo e PIX — mas o cálculo de
  rota **falha** porque recebe o UUID da loja, não o slug.
- O mobile usa outra tela (`MobileNewOrderScreen`), um form plano inferior: sem
  CRM, **sem cálculo de rota** (`delivery_fee:0` fixo), sem desconto, sem PIX,
  sem etapas/voltar.

## Constraints globais

- **Refactor preservando comportamento:** a extração do `NewOrderDrawer` para
  módulos compartilhados não pode mudar o comportamento visível do drawer no
  desktop.
- **Loja por slug, nunca UUID:** o cálculo de taxa (`/stores/{slug}/delivery-fee/`)
  exige o **slug**. Desktop resolve via `OrdersPage`; mobile via
  `rootStore.stores.find(s => s.id === selectedStoreId).slug`.
- **Reuso real:** desktop e mobile usam o MESMO hook e os MESMOS componentes de
  etapa. Sem duplicar lógica de dados.
- **Tokens semânticos**; alvos de toque ≥44px; `env(safe-area-*)` no mobile.
- **Sem regressão:** suíte completa só com `ComboForm.test.tsx` falhando
  (pré-existente). `tsc` limpo; build OK.
- Branch `feat/neworder-wizard-reuse`. Não dar push na `main` sem aprovação.

## Arquitetura

### Seam (já existe no código, linha ~680 de NewOrderDrawer.tsx)
As 5 etapas (`StepCliente`, `StepEntrega`, `StepItens`, `StepAjustes`,
`StepConfirmar`) já são componentes puros prop-driven; o estado e os handlers
vivem no componente do drawer. Extraímos os dois lados.

### Módulo compartilhado — `src/components/orders/newOrder/`
- `useNewOrderWizard.ts` — hook dono de TODO o estado (step, customer, delivery
  method, endereço, routeQuote, cart, desconto/acréscimo, pagamento, submitting)
  e dos handlers: `handleCalculateRoute`, add/qty/remove do carrinho,
  `canProceed(step)`, `handleSubmit`, navegação `next()/back()/goTo()`. Recebe
  `{ storeSlug, storeId, initialCustomer?, onCreated? }`. Expõe um objeto único
  consumido pelas etapas e pelos dois "chromes".
- `steps/StepCliente.tsx`, `steps/StepEntrega.tsx`, `steps/StepItens.tsx`,
  `steps/StepAjustes.tsx`, `steps/StepConfirmar.tsx` — extraídos verbatim (mesma
  UI), recebendo o que precisam do hook via props.
- `NewOrderSteps.tsx` (opcional) — um switch `step → componente` para os dois
  chromes renderizarem `<NewOrderSteps step={step} wizard={wizard} />`.
- `STEPS` — metadados das etapas (título, índice) usados pela barra de progresso.

### Desktop — `NewOrderDrawer.tsx` (vira chrome fino)
Mantém o slide-over (`fixed right-0 top-0 bottom-0 w-full max-w-md`, backdrop,
header, barra de progresso, footer Voltar/Próximo). Internamente usa
`useNewOrderWizard(...)` e renderiza as etapas compartilhadas. **Aparência e
comportamento idênticos.**

### Mobile — aba "Novo" (`MobileNewOrderScreen.tsx` reescrita)
Tela cheia (`fixed inset-0 z-[60]`, acima da bottom nav → foco total) usando o
MESMO hook + etapas:
- Topo: **X** (cancelar → navega para `/?tab=pedidos`) + barra de progresso +
  título da etapa.
- Meio: a etapa atual (scroll só do conteúdo).
- Rodapé fixo (respeita safe-area): **Voltar** (some na etapa 0) / **Próximo**
  (etapas 0–3, travado por `canProceed`) / **Finalizar pedido** (etapa 4, com
  loading).
- Slug: `rootStore.stores.find(s => s.id === selectedStoreId)?.slug`. Sem loja
  selecionada → estado "Selecione uma loja".
- **Sucesso:** `toast.success` + navega para `/?tab=pedidos` (o pedido novo
  aparece na lista ao vivo).

### Fix do cálculo de rota (bug do painel)
Causa-raiz: `src/pages/orders/OrdersPage.tsx` monta o drawer com
`storeSlug={storeQuery}` onde `storeQuery = storeSlug || storeId` — cai no UUID
quando o slug é nulo; o backend faz lookup por slug → 404 → erro engolido.
- **Fix:** passar o slug confirmado (`storeSlug`) ao `NewOrderDrawer`, e só
  renderizar o drawer quando o slug existir (`{storeSlug && <NewOrderDrawer .../>}`
  ou equivalente). Nunca passar o UUID.
- Mobile já nasce correto (usa o slug de `rootStore.stores`).

### Contrato da taxa (reuso)
`ordersService.calculateDeliveryFee(slug, address)` → `POST /stores/{slug}/delivery-fee/`
com `{ address }`. Geocoding é server-side (Google + cache), **sem Google Maps JS
no cliente**. Resposta: `{ fee, distance_km, duration_minutes, is_within_area,
zone, message, ... }`. `fee` entra em `delivery_fee` do pedido e no total.

## Componentes / arquivos

```
src/components/orders/newOrder/
  useNewOrderWizard.ts        # estado + handlers (extraído do drawer)
  NewOrderSteps.tsx           # switch step -> componente + STEPS metadata
  steps/StepCliente.tsx
  steps/StepEntrega.tsx       # cálculo de rota
  steps/StepItens.tsx
  steps/StepAjustes.tsx
  steps/StepConfirmar.tsx     # pagamento + total
  __tests__/useNewOrderWizard.test.ts
```

Modificados:
- `src/components/orders/NewOrderDrawer.tsx` — vira chrome usando o hook+etapas.
- `src/mobile/screens/MobileNewOrderScreen.tsx` — reescrita como wizard full-screen.
- `src/pages/orders/OrdersPage.tsx` — fix do slug (1–2 linhas).
- Removidos/simplificados: os testes antigos de `MobileNewOrderScreen` que
  cobriam o form plano (substituídos pelos testes do wizard mobile).

## Tratamento de erro / borda

- Cálculo de rota: loading + erro ("não foi possível calcular") sem quebrar o
  fluxo; fora de área (`fee` nulo / >16km) → permite finalizar com aviso "taxa a
  combinar" (comportamento atual do drawer mantido).
- Sem loja (mobile): estado "Selecione uma loja".
- Submit: erro → toast; sucesso → navega/limpa (drawer fecha; mobile vai p/ Pedidos).

## Testes

- `useNewOrderWizard`: `canProceed` por etapa (cliente+telefone na 0; endereço/
  retirada na 1; ≥1 item na 2; 3 e 4 livres); `handleCalculateRoute` seta
  routeQuote; total inclui taxa/desconto/acréscimo; payload do `createOrder`
  correto (slug, delivery_fee real, items, desconto/acréscimo condicionais).
- Mobile wizard: começa na etapa 0; Próximo travado sem cliente; avança/volta; X
  navega p/ Pedidos; Finalizar chama createOrder; sem loja mostra placeholder.
- Desktop `NewOrderDrawer`: smoke pós-refactor (abre na etapa 0, navega, footer
  Voltar/Próximo presentes) — garante extração sem regressão.
- `OrdersPage`: passa o slug (não o UUID) ao drawer e só renderiza com slug.

## Fora de escopo

- Autocomplete de endereço (texto livre + geocoding server-side basta).
- Mapa visual no mobile (sem Google Maps JS).
- Mudar a lógica de taxa do backend (já é SSOT correto).
- Redesenhar as 5 etapas (reuso verbatim da UI do drawer).

## Riscos

- **Regressão no drawer desktop:** mitigada por extração preserva-comportamento +
  smoke test do drawer + suíte.
- **Deploy Vercel na main:** trabalho em branch; merge após validação; `tsc`+build gate.
- **Tamanho do refactor:** `NewOrderDrawer.tsx` é grande; a extração é mecânica
  (mover etapas + estado), feita em passos pequenos no plano.
