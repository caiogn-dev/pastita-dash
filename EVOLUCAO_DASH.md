# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-08)

- `npm ci`: ok (5 vulnerabilidades: 1 low, 2 moderate, 2 high — `form-data` high via axios,
  `js-yaml` só em dev tooling, `esbuild/vite` dev-only exige vite 8, breaking).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **376 testes / 90 suítes verdes** (+3 testes, +1 suíte nesta execução).
- `npm run lint`: gate em 400 warnings; **265 warnings** restantes.

## Histórico

### 2026-07-08 — Correção/UX: dashboard mascarava falha TOTAL de carga como loja vazia
- **Medido:** em `DashboardPage.tsx`, `loadData` envolvia `Promise.allSettled([...])`
  num `try/catch`, mas `allSettled` **nunca rejeita** — logo o `catch` com
  `toast.error('Erro ao carregar dados')` era **código morto** para falhas de API.
  Se as 3 chamadas (`getOrders`, `getOrderStats`, `getOverview`) caíssem, todos os
  ramos `status === 'fulfilled'` eram pulados, os KPIs ficavam em `0` e a tabela
  mostrava "Nenhum pedido ainda" — **indistinguível de uma loja realmente vazia**,
  sem banner de erro nem opção de retry. Dashboard é a 1ª tela do dono da loja.
- **Mudado (só `DashboardPage.tsx`):**
  - novo estado `loadError`, resetado no início de cada `loadData`;
  - após o `allSettled`, detecta falha total (`every(r => r.status === 'rejected')`)
    e seta `loadError` + dispara o toast;
  - banner com `role="alert"` ("Não foi possível carregar os dados do dashboard" +
    dica de conexão) e botão **"Tentar novamente"** que rechama `loadData`;
  - carga **parcial** (ao menos 1 sucesso) continua renderizando normalmente, sem alerta.
- **Teste (TDD):** novo `DashboardPage.test.tsx` (3 casos) — escrito **vermelho** antes,
  **verde** depois: (1) alerta+retry quando todas falham; (2) sem alerta em sucesso
  parcial; (3) botão "Tentar novamente" refaz as chamadas e limpa o erro.
- **Antes/depois:** `npm test` 373/89 → **376/90**; `tsc` limpo nos dois lados; lint 265.

### 2026-06-30 — Correção: suíte de PaymentLinkPage estava vermelha (regressão de baseline)
- **Medido:** a baseline estava **vermelha** — `PaymentLinkPage.test.tsx` com 3 de 3
  testes falhando. A página foi reescrita em `3b72fc8` (de "PIX copia-e-cola" para
  "link de pagamento hospedado": cartão/PIX/boleto via `payment_url`/`init_point`),
  mas o teste continuou assertando o contrato antigo (botão "Gerar cobrança PIX",
  `pix_code`, `pix_qr_code`, `QR Code PIX`). Uma suíte vermelha mascara regressões
  futuras, então restaurar o verde é a fatia de maior valor.
- **Mudado:** `PaymentLinkPage.test.tsx` reescrito para o contrato real atual:
  - botão "Gerar link de pagamento";
  - exibe a `payment_url` para abrir/copiar e link "Abrir link de pagamento";
  - novo caso cobrindo o fallback `init_point` quando não há `payment_url`;
  - mantidos os casos de valor inválido e de `payer_name` opcional.
- **Componente não alterado** — somente o teste estava defasado.
- **Antes/depois:** `npm test` 327 passando / 3 falhando → **331 passando / 0 falhando**;
  tsc limpo nos dois lados. Suíte estável em execuções repetidas.
- **Nota de infra:** o ref local `origin/main` estava defasado em `450e238`; um
  `git fetch` trouxe `origin/main` para `333b8f1` (force-update — histórico foi
  reescrito para uma linha órfã em algum momento). A branch deste PR parte de
  `origin/main` correto (`333b8f1`).

### 2026-06-25 — Acessibilidade: nomes acessíveis em botões icon-only
- **Medido:** auditoria de botões "icon-only" (apenas ícone, sem texto) sem
  `aria-label`/`title`. Leitores de tela não anunciavam nada nesses controles.
- **Mudado (componentes ativos apenas):**
  - `Navbar.tsx` (navegação real): hambúrguer mobile → "Abrir menu de navegação";
    fechar drawer → "Fechar menu de navegação".
  - `Header.tsx` (telas mobile): hambúrguer → "Abrir menu de navegação".
  - `ContactInfoPanel.tsx` (chat WhatsApp): fechar painel → "Fechar painel de contato";
    copiar telefone → `aria-label` "Copiar telefone".
  - `VariantsManager.tsx`: editar/excluir variante → `aria-label` descritivo com o
    nome da variante (ex.: "Excluir variante Tamanho G").
  - `Sidebar.tsx` deliberadamente **não** alterado (legado morto, não renderizado).
- **Teste (TDD):** novo `VariantsManager.a11y.test.tsx` — escrito vermelho antes,
  verde depois. Assegura nome acessível nos botões editar/excluir.
- **Antes/depois:** 72→73 suítes, 307→309 testes; tsc limpo nos dois lados.

## Próximos passos priorizados

1. **A11y — controles de mídia sem nome acessível (candidatos mapeados):**
   `MessageBubble.tsx` player de áudio — botão play/pause (~l.226) e mudo (~l.251)
   são icon-only sem `aria-label`, e o `<input type="range">` de seek (~l.264) sem
   label; `Navbar.tsx` `<select>` de contas (~l.294) sem `aria-label` (o irmão
   `StoreSelector` já usa `aria-label="Loja"`). Teste de regressão por componente.
2. **Segurança/deps:** `form-data` (high, via `axios`) e `js-yaml` (moderate, só dev
   tooling) têm fix **não-breaking** via `npm audit fix`; `esbuild/vite` (moderate,
   dev-only) exige vite 8 (breaking) — avaliar à parte. Aplicar o fix não-breaking
   e revalidar `tsc`/testes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
