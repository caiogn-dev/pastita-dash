# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-11)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **421 testes / 104 suítes verdes**.
- `npm run lint`: gate em 400 warnings; **271 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-07-11 — Acessibilidade: nomes acessíveis nos botões de ação de Cupons e Faixas de Entrega
- **Medido:** varredura de botões icon-only (`PencilIcon`/`TrashIcon`) nas páginas
  CRUD ativas `CouponsPage` e `DeliveryZonesPage`. O **card mobile** de ambas não
  tinha `aria-label`/`title` nos botões editar/excluir — leitores de tela
  anunciavam apenas "botão" sem contexto. O **desktop** tinha só `title="Editar"`/
  `"Excluir"` genérico (sem indicar qual item).
- **Mudado (componentes ativos apenas):**
  - `CouponsPage.tsx`: editar/excluir (mobile + desktop) → `aria-label`/`title`
    descritivos com o código do cupom (ex.: "Excluir cupom TESTE10").
  - `DeliveryZonesPage.tsx`: editar/excluir (mobile + desktop) → `aria-label`/`title`
    com o nome da faixa (ex.: "Editar faixa Centro").
  - Botões de toggle de status (badge com texto visível "Ativo"/"Inativa") **não**
    alterados — já possuem nome acessível; fica como follow-up melhorar a
    semântica de "alternar".
- **Teste (TDD):** novos `CouponsPage.a11y.test.tsx` e `DeliveryZonesPage.a11y.test.tsx`
  — escritos vermelhos antes, verdes depois. Garantem que existem exatamente 2
  botões (mobile + desktop) por ação nomeados com o item, e nenhum botão de ação
  com nome genérico "Editar"/"Excluir".
- **Antes/depois:** 417→**421** testes, 102→**104** suítes; `tsc --noEmit` limpo
  nos dois lados; suíte completa verde.

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

1. **A11y — continuar varredura:** botões icon-only ainda sem nome em
   `MessengerAccounts` (editar/excluir conta), `InstagramInbox`/`MessengerInbox`
   (enviar), botões de fechar (`X`) de modais/drawers (`CustomerPanel`,
   `TemplateSelector`, `NewConversationModal`, `ConnectionsPage`). Melhorar também a
   semântica dos botões de toggle de status (badge) em Cupons/Faixas para anunciar
   "alternar". Adicionar teste de regressão por componente conforme tocar.
2. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (271) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
