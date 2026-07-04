# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-04)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **373 testes / 89 suítes verdes**.
- `npm run lint`: gate em 400 warnings; ~265 warnings restantes (limpeza incremental em curso).

## Histórico

### 2026-07-04 — A11y: controles do player de áudio do chat (WhatsApp)
- **Medido:** varredura de botões icon-only continuou pela área crítica do fluxo
  WhatsApp (`ChatWindow` → `MessageBubble`). O player de áudio inline (`AudioPlayer`
  em `MessageBubble.tsx`) tinha três controles **sem nome acessível**: play/pause,
  mudo e o slider de posição (`<input type="range">`). Leitores de tela não
  anunciavam nada — áudios (notas de voz) são mensagens comuns no WhatsApp.
- **Mudado (`src/components/chat/MessageBubble.tsx`):**
  - play/pause: `aria-label` dinâmico "Reproduzir áudio" / "Pausar áudio";
  - mudo: `aria-label` dinâmico "Silenciar áudio" / "Ativar som do áudio";
  - slider: `aria-label="Posição do áudio"`;
  - `type="button"` explícito nos dois botões (evita submit acidental em forms);
  - troca `React.memo` → `memo` (named import). O único uso runtime de `React.`
    no arquivo; sob ts-jest (sem `esModuleInterop`) o default `React` era
    `undefined` e impedia importar o componente em teste. Mudança idiomática,
    alinhada ao JSX automático (`jsx: react-jsx`) — build da Vite intacto.
- **Teste (TDD):** novo `MessageBubble.a11y.test.tsx` — escrito vermelho antes,
  verde depois. Cobre nome acessível nos 3 controles e a troca dinâmica do rótulo
  de mudo ao acionar (simula `loadedmetadata` para habilitar os controles).
- **Antes/depois:** 371→373 testes, 88→89 suítes; `tsc --noEmit` limpo nos dois
  lados. Sem alteração de comportamento visual/funcional.

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

1. **A11y — continuar varredura:** gaps icon-only já mapeados e ainda abertos:
   `InstagramInbox.tsx` (botão de enviar mensagem, `PaperAirplaneIcon`, linha ~650,
   sem `aria-label`/`title`); `NewWhatsAppCampaignPage.tsx` (botão voltar
   `ArrowLeftIcon` ~743 e remover contato `TrashIcon` ~1359). Essas páginas exigem
   mock pesado (contexto de loja/API/router) para testar — priorizar extração
   testável ou teste de página com mocks. Seguir com diálogos.
2. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
