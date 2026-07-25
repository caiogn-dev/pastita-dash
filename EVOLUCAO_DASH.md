# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-25)

- `npm ci`: ok (10 vulnerabilidades reportadas pelo npm: 1 low, 3 moderate, 6 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **493 testes / 120 suítes verdes** (após adicionar `StepItens.a11y.test.tsx`).
- `npm run lint`: gate em 400 warnings (limpeza incremental em curso).

## Histórico

### 2026-07-25 — Acessibilidade: nomes acessíveis nos controles do carrinho (novo pedido)
- **Medido:** varredura de botões *icon-only* (só ícone, sem texto nem `aria-label`/
  `title`) em componentes ativos. No wizard de **novo pedido** (`StepItens.tsx`, etapa
  "Itens"), os três controles de cada linha do carrinho — diminuir (`MinusIcon`),
  aumentar (`PlusIcon`) e remover (`TrashIcon`) — não tinham nome acessível algum.
  Um leitor de tela anunciava apenas "botão, botão, botão", sem indicar a ação nem
  o produto. É um fluxo operacional central (criação de pedido no balcão/atendimento).
- **Mudado (`StepItens.tsx`):** `aria-label` descritivo e dependente do produto:
  - diminuir → "Diminuir quantidade de {produto}" (ou "Remover {produto} do carrinho"
    quando `quantity === 1`, refletindo o comportamento real do `onClick`);
  - aumentar → "Aumentar quantidade de {produto}";
  - lixeira → "Remover {produto} do carrinho".
- **Teste (TDD):** novo `StepItens.a11y.test.tsx` — escrito vermelho antes, verde
  depois. Cobre os dois estados de quantidade (>1 e ==1) e o compartilhamento de nome
  entre o botão de diminuir (que vira "remover") e a lixeira.
- **Antes/depois:** `npm test` 491/119 → **493 testes / 120 suítes**; tsc limpo e
  lint sem novos warnings nos dois arquivos tocados.

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

1. **A11y — continuar varredura:** ~78 botões icon-only sem nome acessível ainda
   pendentes (varredura por código, robusta a `=>` em atributos). Próximos alvos de
   maior tráfego: `DashboardPage.tsx` (botão de refresh no banner de pendentes, linha
   ~340), `OrderDetailContent.tsx`, `AgentsPage.tsx`, `AccountsPage.tsx`. Adicionar
   teste de regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps:** triar as 10 vulnerabilidades do `npm audit` (1 low, 3
   moderate, 6 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
