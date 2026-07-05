# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-05)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **375 testes / 90 suítes verdes**.
- `npm run lint`: gate em 400 warnings; ~266 warnings restantes (limpeza incremental em curso).

## Histórico

### 2026-07-05 — Acessibilidade: nomes acessíveis nos botões icon-only da campanha WhatsApp
- **Medido:** varredura de botões "icon-only" (apenas ícone, sem texto) sem
  `aria-label`/`title` na `NewWhatsAppCampaignPage.tsx` (página de maior prioridade
  do backlog). Três controles não anunciavam nada para leitores de tela:
  - botão de voltar do cabeçalho (`ArrowLeftIcon`);
  - botão de adicionar contato no passo Destinatários (`PlusIcon`);
  - botão de remover contato de cada linha da lista (`TrashIcon`).
- **Mudado (`NewWhatsAppCampaignPage.tsx`):**
  - voltar → `aria-label="Voltar para campanhas WhatsApp"` (nome distinto do botão
    "Voltar" do rodapé, que já tem texto);
  - adicionar → `aria-label="Adicionar contato"`;
  - remover → `aria-label={\`Remover contato ${contact.phone}\`}` (nome único por linha).
  - `<React.Fragment>` da navegação de passos trocado por `Fragment` (import nomeado):
    remove a dependência do binding default `React` (indefinido sob ts-jest com
    `esModuleInterop` off) e torna a página renderável em teste. Sem mudança de runtime.
- **Teste (TDD):** novo `NewWhatsAppCampaignPage.a11y.test.tsx` — escrito vermelho antes,
  verde depois. Renderiza a página, dirige o fluxo (Conta → Mensagem texto →
  Destinatários) e assegura nome acessível nos botões voltar, adicionar e remover.
- **Antes/depois:** 89→90 suítes, 373→375 testes; tsc limpo nos dois lados.

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

1. **A11y — continuar varredura:** falta o botão de enviar (`PaperAirplaneIcon`,
   sem nome) da `InstagramInbox.tsx` (linha ~650) e diálogos. Os botões da
   `NewWhatsAppCampaignPage` já foram cobertos em 2026-07-05. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
