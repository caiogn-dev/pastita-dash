# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-19)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high —
  `form-data` high tem `npm audit fix` não-breaking; `vite`/`esbuild` só via `--force`).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **486 testes / 118 suítes verdes** (era 482/117 antes desta fatia).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-07-19 — A11y: nomes acessíveis e labels associados em MessengerAccounts
- **Medido:** varredura de controles icon-only sem nome acessível nas páginas ativas.
  `src/pages/messenger/MessengerAccounts.tsx` tinha os piores casos — botões de
  **editar** e **excluir** conta (ícones lápis/lixeira) e o **fechar** do modal
  **sem `aria-label` nem `title`**: leitores de tela não anunciavam nada. Além disso,
  o campo de **busca** só tinha `placeholder` (não é nome acessível) e os `label`
  do formulário do modal **não estavam associados** aos inputs (sem `htmlFor`/`id`).
- **Mudado (componente ativo):**
  - editar conta → `aria-label="Editar conta <página>"` + `title`;
  - excluir conta → `aria-label="Excluir conta <página>"` + `title`;
  - fechar modal → `aria-label`/`title` "Fechar";
  - busca → `aria-label="Buscar contas"`;
  - cada `label` do modal ganhou `htmlFor` casado com o `id` do input correspondente.
- **Teste (TDD):** novo `MessengerAccounts.a11y.test.tsx` — escrito vermelho (4/4
  falhando) antes, verde depois. Cobre nomes acessíveis dos botões, do campo de busca
  e a associação label↔input via `getByLabelText`. Mocka só `useConfirm` do barrel de
  hooks (o barrel arrasta `import.meta` via useWebSocket→useStore→storeConfig).
- **Antes/depois:** 117→118 suítes, 482→486 testes; `tsc --noEmit` limpo nos dois lados.

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

1. **Segurança/deps (fatia rápida e segura):** aplicar `npm audit fix` (não-`--force`)
   para o `form-data` (high, CRLF injection) e `js-yaml` (moderate) — sem breaking
   change. Deixar `vite`/`esbuild` (só via `--force`, sobe pra vite@8) para uma fatia
   dedicada com validação de build.
2. **A11y — continuar varredura:** próximos alvos `NewWhatsAppCampaignPage`,
   `InstagramInbox` e `ConnectionsPage` (os botões de ação lá têm `title`, que já dá
   nome acessível de fallback, mas o `Modal` de QR/fechar merece revisão). Adicionar
   teste de regressão por componente conforme tocar.
   - **Nota de segurança (OK):** `ConnectionsPage` renderiza SVG de QR como `<img>`
     (`data:image/svg+xml`), **não** via `dangerouslySetInnerHTML` — sem XSS. `tokenStorage`
     centraliza a leitura do token (sem parse solto de localStorage).
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
