# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-10)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **418 testes / 101 suítes verdes** (após a fatia de a11y do Toast abaixo).
- `npm run lint`: gate em 400 warnings; **271 warnings** restantes, 0 erros.

## Histórico

### 2026-07-10 — Acessibilidade: Toast global vira região viva anunciável
- **Medido:** varredura de botões icon-only sem nome acessível achou 67 candidatos.
  O maior alavancamento é o `Toast` global (`src/components/molecules/Toast.tsx`),
  usado app-wide via `useToast`/`ToastContext` para todo sucesso/erro. Dois buracos:
  (1) o botão de fechar (só `XMarkIcon`) não tinha nome acessível — leitor de tela
  anunciava nada; (2) o toast não era uma live region — **nenhuma** notificação era
  anunciada a quem usa leitor de tela (feedback de salvar/erro invisível).
- **Mudado (`Toast.tsx`):**
  - botão de fechar ganhou `type="button"` + `aria-label="Fechar notificação"`,
    `focus-visible:ring` e `aria-hidden` no ícone;
  - o container do toast virou live region: `role="alert"` + `aria-live="assertive"`
    para `error`/`warning` (interrompe) e `role="status"` + `aria-live="polite"`
    para `success`/`info` (anúncio educado).
- **Teste (TDD):** novo `Toast.a11y.test.tsx` — escrito vermelho (5/5 falhando) antes,
  verde depois. Cobre nome do botão e o role correto por tipo de toast.
- **Antes/depois:** 100→101 suítes, 413→418 testes; tsc limpo e lint 271 warnings
  (sem erros) nos dois lados. Componente ativo (o `ui/toast.tsx` legado não foi tocado).

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

1. **A11y — continuar varredura:** ainda restam ~66 botões icon-only sem nome
   acessível (lista completa levantada em 2026-07-10). Priorizar primitivas
   compartilhadas de alto alavancamento: `ui/input.tsx` (limpar busca),
   `ui/toast.tsx` (legado, confirmar se ainda é usado) e diálogos (`modal.tsx`).
   Depois páginas de marketing/instagram. Teste de regressão por componente.
2. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes (evitar o
   `--force` que sobe `vite@8`).
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
