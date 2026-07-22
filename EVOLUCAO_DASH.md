# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-21)

- `npm ci`: ok (7 vulnerabilidades reportadas pelo npm: 1 low, 1 moderate, 5 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **482 testes / 117 suítes verdes**.
- `npm run build`: **ok** (build de produção conclui sem erros).
- `npm run lint`: gate em 400 warnings; **260 warnings** restantes (0 erros).

## Histórico

### 2026-07-21 — Código morto: remoção das páginas Instagram retiradas da superfície
- **Medido:** o Instagram foi retirado da superfície do produto (ver
  `src/pages/inbox/inboxTabs.ts`: "Instagram e Messenger foram retirados da
  superfície"; `resolveInboxTab('instagram')` cai em `'whatsapp'`). Restaram 4
  componentes de página órfãos em `src/pages/instagram/` (~1800 linhas):
  `InstagramInbox.tsx`, `InstagramDashboardPage.tsx`, `InstagramAccountsPage.tsx`,
  `InstagramCallbackPage.tsx` (+ o `index.ts` que os reexporta). Varredura
  exaustiva (`grep` por cada nome de componente, por `pages/instagram`, por
  `lazy`/`import(` dinâmicos e por rotas em `App.tsx`) confirmou **zero**
  referências ativas fora do próprio diretório e **nenhum** teste os cobrindo.
  O `InstagramInbox` morto ainda carregava uma dívida de a11y (botão de enviar
  icon-only sem nome acessível) — some junto.
- **Mudado:** removido o diretório `src/pages/instagram/` inteiro.
- **Preservado (código vivo, NÃO tocado):** `src/services/instagram.ts` continua
  em uso por `ConnectionsPage.tsx` (conexão de contas Instagram via OAuth),
  `features/channels/api.ts` e `hooks/useInstagram.ts`. A remoção é só de UI morta.
- **Garantia de zero-regressão:** como o código era inalcançável, a prova é a
  suíte + tsc + build **verdes depois** da remoção — nada dependia dele.
- **Antes/depois:** `npm test` 482/482 verdes nos dois lados; tsc limpo nos dois
  lados; `npm run build` ok; lint 260 warnings (0 erros). ~1800 linhas de código
  morto a menos.

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

1. **Segurança/deps (ALTO):** `npm audit` reporta 5 vulnerabilidades **high**,
   sendo a mais crítica **axios** (prototype pollution + DoS) — axios é o cliente
   HTTP de toda a API do painel. `npm audit fix` (sem `--force`) resolve axios,
   `form-data`, `js-yaml`, `brace-expansion` e `@babel/core` de forma
   semver-compatível; validar com `npm run build` + suíte + tsc antes de mergear.
   O `esbuild`/`vite` só sai com `--force` (vite 8, breaking) — deixar fora.
2. **A11y — continuar varredura:** botões icon-only em `NewWhatsAppCampaignPage`
   e diálogos. Adicionar teste de regressão de acessibilidade por componente
   conforme tocar. (Alvo `InstagramInbox` saiu do backlog — era código morto,
   removido em 2026-07-21.)
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (260) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1873 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1706 linhas) para code-splitting/extração.
