# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-14)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **378 testes / 90 suítes verdes** (era 373/89; +5 testes de a11y do Instagram Inbox).
- `npm run lint`: 265 warnings, 0 erros (gate em 400).

## Histórico

### 2026-07-14 — Acessibilidade: nomes acessíveis no Instagram Inbox (DM) + habilita testes que importam CSS
- **Medido:** varredura de controles icon-only na `InstagramInbox.tsx` (workflow de
  DM do Instagram). O **botão de enviar mensagem não tinha nome acessível algum**
  (sem `aria-label`/`title`) — leitor de tela não anunciava nada. Também sem nome
  acessível: campo de digitar mensagem, campo de busca e o seletor de conta
  (apenas `placeholder`, que não é nome acessível confiável).
- **Infra de teste:** o `jest.config` mapeava CSS para `identity-obj-proxy`, mas o
  pacote **não estava instalado** — qualquer teste que renderizasse um componente
  com `import './x.css'` quebrava. Adicionado `identity-obj-proxy` como devDependency
  (era exatamente o que a config já esperava); destrava testes de componentes com CSS.
- **Mudado (`InstagramInbox.tsx`):** `aria-label` em enviar mensagem, campo de
  mensagem, busca de conversas, seletor de conta, e nos botões Templates/Ferramentas
  e Atualizar (reforço além do `title`).
- **Teste (TDD):** novo `InstagramInbox.a11y.test.tsx` — escrito vermelho antes
  (4/5 falhando), verde depois. Mocka os serviços do Instagram e dirige o fluxo até
  a conversa auto-selecionada, assertando nome acessível nos 5 controles.
- **Antes/depois:** 373→378 testes, 89→90 suítes; tsc limpo nos dois lados; lint sem
  novos warnings.

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

1. **A11y — continuar varredura:** aplicar o mesmo tratamento no **WhatsApp Inbox**
   (`WhatsAppInboxPage.tsx`, workflow principal): o `send-btn` e o campo de mensagem
   também estão sem nome acessível; e nos botões icon-only de `NewWhatsAppCampaignPage`
   e diálogos. Agora que `identity-obj-proxy` está instalado, dá para testar componentes
   com CSS. Adicionar teste de regressão de a11y por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
