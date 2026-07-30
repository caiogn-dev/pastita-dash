# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-30)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **556 testes / 135 suítes verdes** (era 553/134; +3/+1 desta fatia).
- `npm run build` (tsc && vite build, igual à Vercel): **ok** (~17s).

## Histórico

### 2026-07-30 — Acessibilidade: nome acessível em TODOS os modais (aria-labelledby / aria-label no Modal canônico)
- **Medido:** o `Modal` canônico (`src/components/ui/modal.tsx`) — fonte única de
  todos os modais do painel — expunha `role="dialog"` + `aria-modal="true"` **sem
  nome acessível**. Um leitor de tela anunciava apenas "diálogo", sem dizer do que
  se tratava. O header embutido renderizava `<h2>{title}</h2>`, mas **não estava
  ligado** ao elemento com `role="dialog"` via `aria-labelledby`. É uma falha
  WAI-ARIA (todo dialog precisa de nome). Afetava todos os consumidores:
  `OrderDetailModal`, `PaywallModal`, `ComboModal`, `ProductFormModal`, e os
  diálogos de confirmação app-wide via `useConfirm` → `ConfirmModal`.
- **Mudado (componente canônico — conserta o app inteiro de uma vez):**
  - `title` presente → `<h2 id={titleId}>` ligado ao dialog via `aria-labelledby`
    (id estável por `useId`);
  - nova prop opcional `ariaLabel` para o **caminho composto** (sem `title`
    embutido, ex.: layouts customizados) — vira `aria-label` no dialog;
  - `ConfirmModal` (layout centrado com ícone, não usa o header embutido) passa
    `ariaLabel={title}` ao `Modal` interno → agora todo confirm/`useConfirm` tem nome.
- **Teste (TDD, vermelho→verde):** novo `Modal.a11y.test.tsx` (3 casos) — escrito
  **vermelho antes** (3/3 falhando), verde depois. Usa `getByRole('dialog', { name })`
  (computa o nome acessível): título embutido via `aria-labelledby`, `ariaLabel` no
  caminho composto, e `ConfirmModal` nomeado pelo próprio título. `Modal.focus.test.tsx`
  segue verde (sem regressão na gestão de foco).
- **Antes/depois:** `npm test` 553/134 → **556/135**; tsc limpo e `vite build` ok
  nos dois lados. Só a11y adicionada (2 atributos ARIA + 1 prop opcional), sem
  mudança de comportamento visual.
- **Próximo passo:** os consumidores do wrapper `ui/dialog.tsx` que montam o
  próprio `DialogTitle` (`WhatsAppAuthDialog`, `ConnectionsPage`,
  `MessengerAccounts`, `PrintSettingsPage`) ainda não passam nome — plumbar
  `ariaLabel` (ou `aria-labelledby` ao `DialogTitle`) pelo `Dialog` e adotar em
  cada um, com teste por componente.

## Baseline atual (2026-06-30)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **331 testes / 77 suítes verdes** (após corrigir suíte de PaymentLinkPage).
- `npm run lint`: gate em 400 warnings; ~266 warnings restantes (limpeza incremental em curso).

## Histórico

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

1. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
