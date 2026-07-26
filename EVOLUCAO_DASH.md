# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-26)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **505 testes / 122 suítes verdes** (após esta fatia; antes 502/121).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (0 erros).

## Histórico

### 2026-07-26 — Acessibilidade: nomes acessíveis nos botões de ação do inbox + destravar teste de CSS
- **Medido:** auditoria de botões icon-only (só ícone/emoji, sem texto) em componentes
  efetivamente renderizados. Encontrados ~28 casos sem nome acessível. Priorizados os
  do fluxo principal do produto (inbox de mensagens — WhatsApp/Messenger/Instagram).
  Além disso, o `moduleNameMapper` de CSS do Jest apontava para `identity-obj-proxy`,
  pacote **não instalado**, o que quebrava qualquer teste de componente que importasse
  folha de estilo (nenhum teste conseguia cobrir esses componentes).
- **Infra (destrava testes):** `jest.config.cjs` passou a mapear CSS/SCSS para
  `src/__mocks__/styleMock.js` (stub local `{}`), removendo a dependência do pacote
  ausente. Zero regressão — nenhum teste dependia do comportamento de proxy de classes.
- **Mudado (componentes ativos):**
  - `MediaViewer.tsx` (visualizador de mídia do inbox WhatsApp): botões `⬇️` e `✕`
    ganharam `aria-label`/`title` ("Baixar mídia" / "Fechar visualização de mídia") e
    `type="button"`; `<img>` agora tem `alt` não-vazio mesmo sem `fileName` ("Mídia").
  - `WhatsAppInboxPage.tsx`, `MessengerInbox.tsx`, `InstagramInbox.tsx`: botão de
    enviar (`PaperAirplaneIcon`) recebeu `aria-label`/`title` "Enviar mensagem".
- **Teste (TDD):** novo `MediaViewer.a11y.test.tsx` — escrito vermelho antes, verde
  depois. Cobre nome acessível dos botões, disparo de `onClose` e `alt` da imagem.
- **Antes/depois:** 121→122 suítes, 502→505 testes; tsc limpo nos dois lados; lint 0 erros.

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

1. **A11y — continuar varredura (backlog auditado):** ~22 botões icon-only restantes
   sem nome acessível, agora destrancados para teste (mapper de CSS corrigido).
   Priorizar os botões **fechar/dismiss** de diálogos: `EditOrderDrawer` (`XMarkIcon`),
   `ConnectionsPage`, `MessengerAccounts` (fechar + editar/excluir linha), `AgentForm`,
   `IntentLogsPage`, `WhatsAppCampaignsPage`, `NewCampaignPage` (email, `✕`). Depois:
   botão de enviar do `AgentChatTest`, voltar (`ArrowLeftIcon`) nas telas de agentes/
   marketing, copiar/regenerar API key em `CompanyProfileDetailPage`, refresh do
   `DashboardPage`. Adicionar teste de regressão por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
