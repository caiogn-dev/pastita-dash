# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-03)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **361 testes / 87 suítes verdes**.
- `npm run lint`: gate em 400 warnings; **270 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-07-03 — A11y: nomes acessíveis nos botões icon-only do chat WhatsApp
- **Medido:** varredura por botões "icon-only" (só ícone, sem texto nem
  `aria-label`/`title`) nos componentes ativos do fluxo principal de WhatsApp
  (`src/components/chat/*`). Sete botões não anunciavam nada para leitores de tela:
  fechar painel do cliente, fechar templates, fechar "Nova Conversa", remover
  arquivo selecionado (2 variantes: preview de imagem e anexo genérico) e os
  controles de áudio (reproduzir/pausar e silenciar/ativar som) do `MessageBubble`.
- **Mudado (componentes ativos apenas):**
  - `CustomerPanel.tsx`: fechar → `aria-label="Fechar painel do cliente"`.
  - `TemplateSelector.tsx`: fechar → `aria-label="Fechar templates"`.
  - `NewConversationModal.tsx`: fechar → `aria-label="Fechar"`.
  - `MessageInput.tsx`: remover arquivo (imagem e anexo) → `aria-label="Remover
    arquivo selecionado"`.
  - `MessageBubble.tsx`: play/pause → `aria-label` dinâmico ("Reproduzir áudio" /
    "Pausar áudio"); mute → `aria-label` dinâmico ("Silenciar áudio" / "Ativar som
    do áudio").
  - Todos ganharam `type="button"` (evita submit acidental dentro de forms).
  - Componentes legados **não** alterados (ex.: `Sidebar.tsx`).
- **Teste (TDD):** novo `src/components/chat/__tests__/chatA11y.test.tsx` cobrindo
  o nome acessível do botão de fechar (`CustomerPanel`) e do botão de remover
  arquivo (`MessageInput`) — ambos renderizáveis em isolamento sem chamadas de API.
- **Antes/depois:** 86→87 suítes, 359→361 testes; tsc limpo nos dois lados; sem
  novos warnings de lint (270 no total, apenas `any` pré-existentes no `MessageBubble`).

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

1. **A11y — continuar varredura:** o fluxo de chat WhatsApp (`src/components/chat/*`)
   já foi coberto (2026-07-03). Restam botões icon-only mapeados em:
   `InstagramInbox.tsx` (enviar mensagem), `MarketingPage.tsx` (QuickAction — na
   verdade tem texto via props, revisar), `customers/CustomersPage.tsx` (3 botões),
   `orders/EditOrderDrawer.tsx` e `NewOrderDrawer.tsx`, `messaging/ConnectionsPage.tsx`,
   `whatsapp/WhatsAppInboxPage.tsx`, `dashboard/DashboardPage.tsx`, `ui/toast.tsx` e
   `ui/dropdown.tsx`. Adicionar teste de regressão por componente conforme tocar.
   (Scan heurístico salvo no histórico do PR; `Sidebar.tsx` é legado — ignorar.)
2. **Segurança/deps:** triar as vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
   `target="_blank"` já auditado (2026-07-03): todos têm `rel="noopener noreferrer"`.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
