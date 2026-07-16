# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-16)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **434 testes / 107 suítes verdes**.
- `npm run lint`: gate em 400 warnings; **272 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-07-16 — Acessibilidade: nome acessível nos botões de fechar dos drawers de Clientes
- **Medido:** varredura de botões "icon-only" (só ícone `XMarkIcon`, sem texto)
  sem `aria-label`/`title`. Dois botões de fechar na página de Clientes ficavam
  mudos para leitor de tela (anunciados apenas como "button"):
  - `CustomerFormDrawer` (drawer de criar/editar cliente), header, botão X;
  - `CustomerDrawer` (drawer de visualização do cliente), header, botão X.
- **Mudado:** `aria-label="Fechar"` nos dois botões. `CustomerDrawer` passou a ser
  exportado para permitir teste unitário direto (antes era interno ao módulo).
- **Teste (TDD):** novo `CustomersDrawers.a11y.test.tsx` — escrito vermelho antes
  (2/2 falhando por ausência de nome acessível), verde depois. Garante nome
  acessível e o disparo de `onClose` em ambos os botões de fechar.
- **Antes/depois:** 106→107 suítes, 432→434 testes; tsc limpo nos dois lados.
- **Nota:** os drawers ainda não têm `role="dialog"`/focus-trap/fechar-no-Esc —
  registrado como próximo passo de a11y (ver lista abaixo).

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

1. **A11y — semântica de diálogo nos drawers:** `CustomerDrawer`/`CustomerFormDrawer`
   (e demais drawers/modais) ainda não têm `role="dialog"` + `aria-modal`,
   focus-trap e fechar-no-`Esc`. É a próxima fatia de a11y de maior valor.
2. **A11y — continuar varredura de icon-only:** ainda faltam nomes acessíveis em
   `DashboardPage` (refresh do banner de pendentes, linha ~340),
   `WhatsAppInboxPage` (botões "Chamada"/"Mais opções") e páginas de marketing/
   instagram. Adicionar teste de regressão por componente conforme tocar.
3. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high). `form-data` (high), `js-yaml` e `@babel/core` têm correção
   sem breaking via `npm audit fix`; `esbuild`/`vite` só via major (`vite@8`) —
   avaliar separadamente. São todas deps de dev/build (não afetam o bundle).
4. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
5. **Lint:** reduzir warnings restantes (272) rumo a baixar o teto de `--max-warnings`.
6. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
