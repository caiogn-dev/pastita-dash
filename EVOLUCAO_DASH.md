# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-20)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **460 testes / 110 suítes verdes** (após esta execução; era 457/109 antes).
- `npm run lint`: gate em 400 warnings; **272 warnings** restantes (0 errors).

## Histórico

### 2026-07-20 — Acessibilidade: toast do painel vira live region + botão de fechar com nome acessível
- **Medido:** varredura de botões icon-only sem nome acessível encontrou 26 candidatos.
  O de maior alavancagem é o toast **`src/components/molecules/Toast.tsx`** — é o
  componente de notificação renderizado em todo o painel via `ToastContext`
  (`src/context/ToastContext.tsx`). Duas lacunas de a11y:
  1. o botão de fechar era **icon-only** (`<XMarkIcon>`) sem `aria-label` e sem
     `type="button"` — leitores de tela não anunciavam nada;
  2. o toast **não era live region** — leitores de tela não anunciavam a
     notificação ao aparecer (nenhum `role`/`aria-live`).
  (Nota: existe também um `src/components/ui/toast.tsx` com a mesma lacuna, mas ele
  **não é o renderizado pelo contexto** — o vivo é o de `molecules`. Deixado para
  uma próxima fatia junto de outros icon-only pendentes.)
- **Mudado (`src/components/molecules/Toast.tsx`):**
  - toast agora é live region: `role="alert"` + `aria-live="assertive"` para
    `type="error"` (interrompe), `role="status"` + `aria-live="polite"` para os
    demais, com `aria-atomic="true"`;
  - botão de fechar: `type="button"` + `aria-label="Fechar notificação"`, ícone
    marcado `aria-hidden`, e anel de foco visível (`focus-visible:ring-2`) no lugar
    do `focus:outline-none` que apagava o foco de teclado.
- **Teste (TDD):** novo `src/components/molecules/__tests__/Toast.a11y.test.tsx` —
  escrito vermelho antes (3/3 falhando), verde depois. Cobre nome acessível do
  botão de fechar, `role="alert"`/assertive em erro e `role="status"`/polite em sucesso.
- **Antes/depois:** `npm test` 457/109 → **460/110** verdes; tsc limpo nos dois lados;
  lint estável em 272 warnings (0 errors). Sem alteração de comportamento visual.

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

1. **A11y — continuar varredura de icon-only:** ainda restam ~25 candidatos sem nome
   acessível (levantados por script nesta execução). Priorizar os de maior alcance:
   `src/components/ui/toast.tsx` (gêmeo do já corrigido, mas não renderizado hoje),
   `src/components/ui/dropdown.tsx`, `modal.tsx`, e páginas
   (`CustomersPage`, `CompanyProfileDetailPage`, `AutomationLogsPage`,
   `WhatsAppInboxPage`, `MarketingPage`). Teste de regressão a11y por componente.
2. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2 moderate,
   2 high). A `high` de `form-data` tem `npm audit fix` sem breaking change — candidata
   segura. A de `esbuild`/`vite` exige major (vite@8) — avaliar à parte.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
