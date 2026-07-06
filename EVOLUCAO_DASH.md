# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-06)

- `npm ci`: ok (5 vulnerabilidades — 1 low, 2 moderate, 2 high — todas em deps de
  build/dev: vite, esbuild, @babel/core, form-data, js-yaml. Não expostas no build
  estático de produção da Vercel; sem valor de segurança em runtime).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **377 testes / 90 suítes verdes**.
- `npm run lint`: gate em 400 warnings; **265 warnings** restantes (limpeza incremental).

## Histórico

### 2026-07-06 — A11y: nomes acessíveis no `MessageInput` (core do WhatsApp)
- **Medido:** `src/components/chat/MessageInput.tsx` (input principal do workflow de
  WhatsApp, apontado como área crítica no CLAUDE.md) tinha botões icon-only sem nome
  acessível. Os dois botões de **remover arquivo** (preview de imagem e de documento)
  não tinham `aria-label` nem `title` — leitores de tela não anunciavam nada. Os
  botões de anexar/emoji/enviar tinham apenas `title` (nome acessível fraco), e o
  botão de enviar não sinalizava o estado de carregamento.
- **Mudado (componente ativo):**
  - remover arquivo (imagem e documento): `aria-label="Remover arquivo selecionado"`
    + `title` + `type="button"`;
  - anexar arquivo e emoji: `aria-label` explícito além do `title`;
  - enviar: `aria-label="Enviar mensagem"` + `aria-busy={isLoading}` (anuncia o
    spinner de envio); removido `title` duplicado.
- **Teste (TDD):** novo `MessageInput.a11y.test.tsx` — escrito vermelho (4/4 falhando)
  antes, verde depois. Cobre nome acessível dos botões de anexar/emoji/enviar, o
  `aria-busy` no envio, e o botão de remover arquivo nos dois previews.
- **Antes/depois:** `npm test` 373→**377** passando, 89→**90** suítes; tsc limpo nos
  dois lados; lint estável em 265 warnings.

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

1. **A11y — continuar varredura:** próximos alvos de botões icon-only sem nome
   acessível: `ContactList.tsx`, `ChatToolsPanel.tsx`, `NewConversationModal.tsx`
   (todos com 0 `aria-label`) e `InstagramInbox.tsx`. Adicionar teste de regressão
   de acessibilidade por componente conforme tocar.
2. **Segurança/deps:** as 5 vulnerabilidades do `npm audit` estão todas em deps de
   build/dev (vite, esbuild, @babel/core, form-data, js-yaml) — sem exposição no
   build estático de produção. Avaliar `npm audit fix` só se não houver breaking
   change nas versões de vite/esbuild (major bumps exigem validação do build).
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
