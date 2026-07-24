# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-24)

- `npm ci`: ok (9 vulnerabilidades reportadas pelo npm: 1 low, 3 moderate, 5 high).
  `npm audit` não consegue consultar o registry pelo proxy nesta execução (504),
  então a triagem de deps fica pendente para um ambiente com rede ao registry.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **487 testes / 118 suítes verdes** (após adicionar estado de erro na PaymentsPage).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (0 errors).

## Histórico

### 2026-07-24 — UX/Resiliência: estado de erro na página de Pagamentos
- **Medido:** `PaymentsPage.tsx` não tinha tratamento de erro. Quando
  `usePaymentsOrders`/`useOrderStats` falhavam (rede/500), `isLoading` virava
  false e a página renderizava **zeros enganosos** — "R$ 0,00 recebido",
  "Nenhum pagamento encontrado" e KPIs zerados. Para uma página de faturamento,
  isso faz o lojista achar que perdeu os dados quando na verdade a API caiu.
- **Mudado (TDD, teste vermelho→verde):**
  - Falha total (nenhum dado em cache) → estado de erro acionável via `EmptyState`
    com ícone de alerta e botão **"Tentar novamente"** (refetch das duas queries),
    em vez dos zeros.
  - Falha parcial (há dados em cache, mas uma query falhou ao atualizar) → **aviso
    não-bloqueante** no topo com retry; a tabela/KPIs em cache continuam visíveis.
  - Novo `src/pages/payments/__tests__/PaymentsPage.test.tsx` (3 casos): erro total
    + retry chama refetch; render normal em sucesso; aviso na falha parcial.
- **Antes/depois:** 484→487 testes, 117→118 suítes; tsc limpo nos dois lados;
  lint sem novos warnings nos arquivos tocados.

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

1. **Estados de erro — continuar varredura:** aplicar o mesmo padrão (erro total
   acionável + aviso de falha parcial) em outras páginas orientadas a query que
   ainda só tratam `isLoading`. Candidatas: páginas em `src/pages/reports` e
   `src/pages/automation` que derivam KPIs de queries e podem exibir zeros na
   falha. Auditar cada uma antes.
2. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
3. **Segurança/deps:** triar as vulnerabilidades do `npm audit` (1 low, 3 moderate,
   5 high) e aplicar `npm audit fix` sem breaking changes — **requer ambiente com
   rede ao registry npm** (o proxy desta execução retorna 504 no audit).
4. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
5. **Lint:** reduzir warnings restantes (267) rumo a baixar o teto de `--max-warnings`.
6. **Bundles pesados:** investigar `storesApi.ts` e `NewWhatsAppCampaignPage.tsx`
   para code-splitting/extração.
