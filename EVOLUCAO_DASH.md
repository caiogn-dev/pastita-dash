# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-18)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high — todas em devDeps: vite/esbuild, form-data, js-yaml).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **461 testes / 110 suítes verdes**.
- `npm run lint`: gate em 400 warnings; limpeza incremental em curso.

## Histórico

### 2026-07-18 — Acessibilidade: toasts anunciáveis por leitores de tela
- **Medido:** varredura de botões só-ícone sem nome acessível (26 candidatos). O
  toast **ativo** do app é `src/components/molecules/Toast.tsx` (montado em toda a
  aplicação via `ToastContext` → `ToastContainer`); o `src/components/ui/toast.tsx`
  é código morto (não importado em lugar nenhum). Dois problemas no toast ativo:
  1. o botão de fechar era só o `XMarkIcon`, **sem `aria-label`** → leitores de tela
     não anunciavam nada nesse controle;
  2. o container do toast **não tinha semântica de live region** (`role`/`aria-live`)
     → notificações efêmeras (sucesso/erro de operações) **não eram anunciadas** a
     usuários de leitor de tela.
- **Mudado (`molecules/Toast.tsx`):**
  - botão de fechar ganhou `aria-label="Fechar notificação"`, `type="button"` e o
    ícone virou decorativo (`aria-hidden`);
  - toast passou a expor live region: `error`/`warning` → `role="alert"` +
    `aria-live="assertive"` (urgente); `success`/`info` → `role="status"` +
    `aria-live="polite"`; ambos com `aria-atomic="true"`.
- **Teste (TDD):** novo `molecules/__tests__/Toast.a11y.test.tsx` — escrito vermelho
  antes, verde depois. Cobre nome acessível do botão de fechar, `onClose(id)` ao
  clicar e as roles `alert`/`status` conforme a urgência.
- **`ui/toast.tsx` deliberadamente não alterado** (código morto, como o `Sidebar.tsx`).
- **Antes/depois:** 109→110 suítes, 457→461 testes; tsc limpo nos dois lados.

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

1. **A11y — continuar varredura de botões só-ícone sem nome acessível.** Reais
   confirmados ainda abertos (com teste de regressão por componente ao tocar):
   `WhatsAppInboxPage.tsx:428` (enviar mensagem), `DashboardPage.tsx:340` (atualizar
   dados), `CustomersPage.tsx:133/245` (fechar drawer) e `:543` (atualizar clientes).
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
