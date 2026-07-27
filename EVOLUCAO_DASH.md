# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-27)

- `npm ci`: ok (10 vulnerabilidades reportadas pelo npm: 1 low, 3 moderate, 6 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **504 testes / 122 suítes verdes** (era 502/121 antes desta fatia; +2 testes de a11y do Toast).
- `npm run lint`: gate em 400 warnings; limpeza incremental em curso.
- **Nota de infra:** o clone veio com `HEAD` destacado em `10edb05` (6 commits à
  frente dos refs `main`/`origin/main` locais, defasados em `5f9b849`). Um
  `git fetch origin main` atualizou `origin/main` para `10edb05`; esta fatia foi
  rebaseada sobre o `origin/main` correto para não descartar os 6 commits reais
  (PDV balcão, etiquetas, impressão).

## Histórico

### 2026-07-27 — A11y: nomes acessíveis em botões icon-only (varredura ampliada)
- **Medido:** varredura por script (`grep` de `<button>` + heurística de ícone/texto)
  encontrou **14 botões icon-only ativos sem nome acessível** (sem `aria-label`,
  `title` nem texto visível). Leitores de tela não anunciavam nada nesses controles.
  5 ocorrências restantes eram falsos positivos (componentes base `Button`/`dropdown`
  que repassam `children`, ou botões que já têm texto — `MarketingPage.QuickAction`,
  `NewConversationModal`, `AgentDetailPage`).
- **Mudado (componentes ativos apenas):**
  - `ui/toast.tsx`: botão fechar → "Fechar notificação" (primitivo usado em todo o painel).
  - `whatsapp/WhatsAppInboxPage.tsx` e `instagram/InstagramInbox.tsx`: botão enviar →
    "Enviar mensagem" (workflows principais de mensageria).
  - `orders/EditOrderDrawer.tsx`, `agents/AgentForm.tsx`: fechar → rótulo descritivo.
  - `messaging/ConnectionsPage.tsx`, `messenger/MessengerAccounts.tsx`: fechar diálogo → "Fechar".
  - `customers/CustomersPage.tsx`, `dashboard/DashboardPage.tsx`, `agents/AgentsPage.tsx`,
    `automation/AutomationLogsPage.tsx`: atualizar → rótulo descritivo.
  - `automation/CompanyProfileDetailPage.tsx`: copiar/regenerar chave de API → rótulos.
  - `agents/AgentChatTest.tsx`, `agents/UnifiedOrchestratorTest.tsx`: enviar/limpar → rótulos.
  - `Sidebar.tsx` deliberadamente **não** alterado (legado morto, não renderizado).
- **Teste (TDD):** novo `ui/__tests__/toast.a11y.test.tsx` — escrito vermelho antes,
  verde depois. Cobre o nome acessível e o `onClose` do botão de fechar do Toast
  (primitivo compartilhado, maior alcance).
- **Antes/depois:** 121→122 suítes, 502→504 testes; tsc limpo nos dois lados.

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

1. **A11y — próximas camadas:** nomes acessíveis em botões icon-only já cobertos
   (varredura de `<button>` limpa — só restam falsos positivos). Próximo foco de a11y:
   (a) `role="status"`/`aria-live` no `Toast` para que notificações sejam anunciadas
   por leitores de tela; (b) foco/`aria-modal`/trap de foco nos diálogos
   (`ConnectionsPage`, `MessengerAccounts`, `EditOrderDrawer`); (c) `aria-label` em
   `<select>`/inputs sem label associado.
2. **Segurança/deps:** triar as 10 vulnerabilidades do `npm audit` (1 low, 3
   moderate, 6 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
