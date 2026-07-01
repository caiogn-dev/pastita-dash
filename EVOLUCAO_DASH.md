# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-01)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **360 testes / 87 suítes verdes** (era 359/86 antes desta execução).
- `npm run lint`: gate em 400 warnings; 270 warnings restantes (0 erros).

## Histórico

### 2026-07-01 — A11y: nome acessível em botões icon-only (Instagram/WhatsApp) + correção de infra de testes
- **Medido:** varredura de botões "icon-only" nas telas de marketing/instagram.
  Gaps reais encontrados:
  - `InstagramInbox.tsx`: botão de **enviar mensagem** (só o ícone `PaperAirplaneIcon`)
    sem nenhum nome acessível — leitores de tela não anunciavam nada.
  - `NewWhatsAppCampaignPage.tsx`: botão **voltar** do cabeçalho e botão **remover
    contato** (`TrashIcon`) sem `aria-label`.
- **Descoberta de infra (bloqueava testes de componentes):**
  - `jest.config.cjs` mapeava CSS para `identity-obj-proxy`, que **não é dependência**
    do projeto — qualquer teste que importasse um componente com `import './x.css'`
    quebrava. Substituído por stub local `src/testStyleMock.js` (sem nova dependência).
  - jsdom não implementa `scrollIntoView` (usado por listas de chat) — adicionado
    stub em `src/setupTests.ts`, junto ao já existente de `ResizeObserver`.
- **Mudado:**
  - `InstagramInbox.tsx`: `aria-label="Enviar mensagem"` no botão de envio.
  - `NewWhatsAppCampaignPage.tsx`: `aria-label` + `type="button"` no voltar
    ("Voltar para campanhas WhatsApp") e no remover contato ("Remover contato {telefone}").
- **Teste (TDD):** novo `InstagramInbox.a11y.test.tsx` — escrito vermelho antes
  (botão de envio sem nome), verde depois. É a **primeira cobertura** dessa página
  de ~700 linhas: monta o inbox com serviços mockados, auto-seleciona a conversa e
  assere o nome acessível do botão de envio.
- **Antes/depois:** `npm test` 359/86 → **360/87**; tsc limpo nos dois lados;
  lint estável em 270 warnings (0 erros).
- **Nota (limitação de teste conhecida):** páginas que usam `React.Fragment` em
  runtime (ex.: `NewWhatsAppCampaignPage`) não renderizam sob o `ts-jest` atual
  porque o `tsconfig.json` não define `esModuleInterop` (o `import React` vira
  `undefined`). Habilitar `esModuleInterop` via tsconfig dedicado ao Jest regride a
  suíte `combos.integration` — precisa de investigação à parte. Por isso a correção
  do botão voltar/remover contato ficou sem teste dedicado nesta fatia (mudança
  aditiva e trivial, coberta por `tsc`).

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

1. **Infra de testes — `esModuleInterop` no Jest:** investigar por que habilitar
   `esModuleInterop` (necessário para testar páginas que usam `React.Fragment` em
   runtime, como `NewWhatsAppCampaignPage`) regride `combos.integration.test.tsx`.
   Destravar isso permite cobrir muitas páginas hoje intestáveis sob `ts-jest`.
2. **A11y — continuar varredura:** diálogos/modais e demais botões icon-only
   (`InstagramAccountsPage`, `InstagramDashboardPage`, `MessengerInbox`). Adicionar
   teste de regressão de acessibilidade por componente conforme tocar.
3. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
4. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
5. **Lint:** reduzir warnings restantes (270) rumo a baixar o teto de `--max-warnings`.
6. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
