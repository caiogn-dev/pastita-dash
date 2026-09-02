# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-09-02)

- `npm ci`: ok. `npm audit`: **10 vulnerabilidades** (1 low, 3 moderate, 6 high),
  transitivas — seguem como fatia dedicada de bump major com validação de build.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **1258 verdes / 224 suítes**; **1 falha PRÉ-EXISTENTE** em
  `precoVigente.cobertura.test.ts` (campanha de WhatsApp lê `product.price` cru
  em `variaveisDaOferta.ts:33` em vez do `preco_vigente`) — registrada abaixo,
  NÃO é regressão desta fatia; é o próximo item de maior valor.
- `npm run build` (tsc && vite build, igual à Vercel): **ok** (~17s).
- Nota de ambiente: o `node_modules` do runner perdeu `recharts` no meio da
  execução (disco ok); `npm ci` restaurou. Não afeta o código.

### Backlog priorizado (aberto)

1. **Preço em campanha de WhatsApp lê `product.price` cru** (ALTO valor —
   manda preço POR ESCRITO ao cliente): `pages/marketing/whatsapp/variaveisDaOferta.ts:33`
   usa `produto.price` (valor de CADASTRO) em vez do `preco_vigente` do dia.
   O teste-guarda `precoVigente.cobertura.test.ts` já falha vermelho. Fix
   envolve o chamador da campanha resolver `preco_vigente` antes de montar a
   oferta. Próxima fatia.
2. **Deps / segurança**: bump major de `react-router` 6→7 e `vite` — fatia
   dedicada com validação de build.

## 2026-09-02 — Pedidos: coluna "Entregue" corta o dia pelo fuso de Brasília

- **Medido (nível de código):** `pedidosDaColuna` (`src/pages/orders/pedidosDoQuadro.ts`)
  filtra a coluna de finalizados por "mesmo dia que agora". O `mesmoDia` usava
  `getFullYear/getMonth/getDate`, que leem o dia no fuso **ambiente** (do
  navegador — ou do CI em UTC). O backend manda `created_at` com offset
  (`…-03:00`); um pedido entregue às 21h+ de Brasília vira o dia SEGUINTE em
  UTC e some do "Entregue" no meio do pico do delivery. O teste
  `pedidosDoQuadro.test.ts` ("não arrasta o que foi entregue ontem") já estava
  **vermelho no CI** (`ubuntu-latest` roda em UTC) — bug latente também em
  produção para qualquer navegador fora do fuso do Brasil.
- **Mudado (1 arquivo de produção):** `mesmoDia` passou a comparar o dia
  renderizado em `America/Sao_Paulo` via `Intl.DateTimeFormat('en-CA', …)`.
  Para um navegador já em horário de Brasília o resultado é **idêntico** ao de
  antes — zero regressão para o operador; corrige a fragilidade de fuso e deixa
  o CI verde.
- **Teste (TDD):** o teste pré-existente virou o "vermelho antes"; adicionei
  um caso explícito ("o corte de 'hoje' é o dia de Brasília, não o fuso de quem
  olha") cobrindo pedidos das 22h e 00h30 de Brasília. Vermelho antes (2/2),
  verde depois (12/12 na suíte).
- **Antes/depois:** suíte `pedidosDoQuadro` 10/12 → **12/12**; total do repo
  passa a ter só a falha pré-existente do preço; `tsc --noEmit` limpo e
  `vite build` ok nos dois lados.
- **Próximo passo priorizado:** item 1 do backlog acima (preço da campanha de
  WhatsApp).

## Baseline atual (2026-08-08)

- `npm ci`: ok. `npm audit`: **8 vulnerabilidades** (3 moderate, 5 high), todas
  transitivas de `react-router`/`react-router-dom`; `npm audit fix` sem `--force`
  disponível — avaliar em fatia dedicada (mexe no roteador, requer validação).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **708 testes / 158 suítes verdes** (era 705/157; +3/+1 desta fatia).
- `npm run build` (vite): **ok** (~14s).
- `npm run lint`: gate em 400 warnings; **255 warnings** restantes (0 errors).

## Histórico

### 2026-08-08 — A11y: nome acessível no `Switch` compartilhado (WCAG 4.1.2)
- **Medido:** o `Switch` de `src/components/common/Switch.tsx` renderiza um
  `<button role="switch" aria-checked>` **sem nome acessível**. Leitores de tela
  anunciavam só "alternância, ligada/desligada" sem dizer O QUE se alternava —
  viola WCAG 4.1.2 (Name, Role, Value). Os 3 consumidores ativos estavam mudos:
  `LinkBioPage` (toggles de blocos do link-na-bio e ativar/desativar link
  personalizado) e `CompanyProfileDetailPage` (aceitar pedidos pelo bot), este
  último já tinha um `<label id="bot-order-enabled-label">` visível **não
  associado** ao controle.
- **Mudado (componentes ativos):**
  - `Switch.tsx` ganhou props opcionais `ariaLabel` e `ariaLabelledby`,
    encaminhadas ao botão como `aria-label`/`aria-labelledby` (sem mudar visual
    nem comportamento; toggles sem nome continuam válidos em TS mas agora podem
    ser rotulados).
  - `LinkBioPage.tsx`: toggles de blocos → `ariaLabel="Exibir <bloco> no link da
    bio"`; switch de link personalizado → `ariaLabel="Ativar/Desativar link
    <título>"`.
  - `CompanyProfileDetailPage.tsx`: switch do bot → `ariaLabelledby` apontando
    para o `<label>` visível já existente (reaproveita o rótulo, sem duplicar
    texto).
- **Teste (TDD):** novo `Switch.a11y.test.tsx` — escrito **vermelho antes**
  (3/3 falhando: sem nome acessível o `getByRole('switch', { name })` não
  encontra) **verde depois**. Cobre nome via `aria-label`, via `aria-labelledby`
  e a preservação de `aria-checked`.
- **Antes/depois:** `npm test` 705/157 → **708/158**; tsc limpo e `vite build`
  ok nos dois lados. Só produção alterada: atributos de acessibilidade
  opcionais, risco baixo.
## Baseline atual (2026-08-06)

- `npm ci`: ok. `npm audit`: **6 vulnerabilidades (3 moderate, 3 high)**, todas
  bloqueadas em major bump — `postcss`/`vite`/`esbuild` são dev/build-only e o
  fix do `react-router` (open redirect via backslash, moderate) só existe no
  **7.18.x** (afetados 6.0.0–7.17.0; não há patch dentro do `^6`). Bumps majores
  ficam como fatia dedicada com validação de build.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **599 testes / 142 suítes verdes** (era 595/141; +4/+1 desta fatia).
- `npm run build` (tsc && vite build, igual à Vercel): **ok** (~16s).

## Histórico

### 2026-08-06 — A11y: nome acessível no `Modal` (fonte única de todos os diálogos)
- **Medido:** varredura de segurança/UX a nível de código. O `Modal` canônico
  (`src/components/ui/modal.tsx`) — que já tinha focus trap, Escape, restauração
  de foco e lock de scroll ref-contado — renderizava `role="dialog"` +
  `aria-modal="true"` **sem `aria-labelledby` nem `aria-label`**. Pela ARIA
  Dialog Pattern, um diálogo modal precisa de nome acessível; sem ele, leitores
  de tela anunciam só "diálogo", sem dizer do que se trata. Como o `Modal` é a
  fonte única de **todos** os modais do painel (`ConfirmModal`, `ui/dialog`,
  pedidos, combos, paywall, lojas, zonas de entrega, PDF de cardápio…), o defeito
  se repetia em cada consumidor.
- **Mudado (componente ativo, mudança puramente aditiva):**
  - `Modal`: quando há `title` embutido, gera um `id` (via `useId`), coloca-o no
    `<h2>` do header e aponta `aria-labelledby` do diálogo para ele.
  - `Modal`: novas props `ariaLabel` e `ariaLabelledby` para o **caminho composto**
    (sem `title`). Precedência: `ariaLabelledby` explícito → título embutido →
    `ariaLabel`. Se houver labelledby, o `aria-label` é omitido (não empilha).
  - `ConfirmModal`: passa a nomear o próprio diálogo pelo seu `<h3>` de título
    (id via `useId` + `ariaLabelledby`).
  - `ui/dialog.tsx`: repassa `ariaLabel`/`ariaLabelledby` ao `Modal` para os
    consumidores compostos poderem se nomear.
- **Teste (TDD):** nova suíte `modal.a11y.test.tsx` — escrita **vermelha (4/4
  falhando) antes, verde depois**. Cobre: nome via `title` embutido, `ariaLabel`
  explícito, `ariaLabelledby` explícito (caminho composto) e `ConfirmModal`
  nomeado pelo próprio título — tudo via `getByRole('dialog', { name })`, que
  resolve o nome acessível de verdade.
- **Antes/depois:** `npm test` 595/141 → **599/142**; `tsc --noEmit` limpo e
  `vite build` ok nos dois lados. Zero mudança de comportamento visual — só
  atributos de acessibilidade adicionados.
- **Próximo passo priorizado:** (1) **A11y — dialog.tsx composto:** ligar
  `DialogTitle`↔`Dialog` via contexto para nomear automaticamente os diálogos
  que usam `DialogTitle` (hoje precisam passar `ariaLabelledby` à mão). (2)
  **Segurança/deps:** planejar o major bump de `react-router` 6→7 (corrige o
  open redirect) e `vite` 5→8 (corrige esbuild/postcss dev-only), cada um como
  fatia dedicada com validação de build. (3) **Estados de erro:** seguem maduros
  nas páginas de query (Analytics/Payments/IntentStats já cobertas).
## Baseline atual (2026-08-03)

- `npm ci`: ok (6 vulnerabilidades: 3 moderate, 3 high). `npm audit fix` não-`--force`
  desta vez arrasta bumps de `vite`/`rollup` (binários de plataforma) — não é uma
  fatia mínima/segura; adiado.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **563 testes / 137 suítes verdes** (era 561/136; +2/+1 desta fatia).
- `npm run build` (tsc && vite build, igual à Vercel): **ok** (~17s).

## Histórico

### 2026-08-03 — UX/Resiliência: estado de erro nos KPIs da página de Clientes
- **Medido:** varredura das páginas orientadas a query em busca do mesmo padrão de
  "zeros enganosos" já corrigido em `PaymentsPage` (2026-07-24). `CustomersPage.tsx`
  tinha a falha: os 4 KPIs do topo (**Total**, **Ativos**, **Com pedidos**,
  **Receita total**) derivam de `useCustomerStats`, mas **`statsQuery.error` era
  totalmente ignorado** — só `customersQuery.error` disparava toast. Quando o
  endpoint `/stores/customers/stats/` caía (rede/500) sem cache, os cards
  renderizavam `0`, `0`, `0`, `R$ 0,00`, enganando o lojista a achar que perdeu
  todos os clientes e o faturamento.
- **Descartado antes (sem bug):** `useAutomationEnabled` usa `queryKey: ['agents','gating']`
  sem store — **intencional e documentado** (`/agents/` é account-scoped). As demais
  queryKeys (`useReports`, `useCustomerStats`, `useOrderStats`, `usePaymentsOrders`,
  `useProducts`, `useCustomers`…) já incluem a loja. `IntentStatsPage` já trata erro.
- **Mudado (`CustomersPage.tsx`, mesmo padrão do `PaymentsPage`):** quando o stats
  falha SEM cache (`isError && data === undefined`), a seção de KPIs mostra um
  `EmptyState` acionável ("Não foi possível carregar os indicadores" + botão
  **"Tentar novamente"** que refaz as duas queries) em vez dos zeros. Com dado em
  cache (falha só ao atualizar), mantém os números anteriores.
- **Teste (TDD, vermelho→verde):** novo `__tests__/CustomersKpiError.test.tsx` (2 casos):
  (1) stats falha sem cache → não renderiza "Receita total"/`R$ 0,00`, mostra o erro
  e o clique em "Tentar novamente" chama `refetch`; (2) stats com dados → KPIs reais,
  sem estado de erro. Escrito vermelho (caso 1 falhando: "Receita total" presente),
  verde após a correção.
- **Antes/depois:** 561→563 testes, 136→137 suítes; tsc limpo e `vite build` ok nos
  dois lados; lint sem novos warnings nos arquivos tocados.
- **Próximo passo priorizado:** continuar a varredura de "zeros enganosos" nas
  seções de KPI derivadas de query — próximas candidatas: `ProductsPage` (contadores
  do topo), seções de `reports/` que somam via query, e `AnalyticsPage`. Auditar cada
  uma antes de tocar. Deps: reavaliar `npm audit` num ambiente onde o `audit fix`
  não-`--force` resolva sem arrastar `vite`/`rollup` (hoje 3 high/3 moderate).

## Baseline atual (2026-07-19)
## Baseline atual (2026-07-20)

- `npm ci`: ok (5 vulnerabilidades reportadas pelo npm: 1 low, 2 moderate, 2 high —
  `form-data` high tem `npm audit fix` não-breaking; `vite`/`esbuild` só via `--force`).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **486 testes / 118 suítes verdes** (era 482/117 antes desta fatia).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-07-19 — A11y: nomes acessíveis e labels associados em MessengerAccounts
- **Medido:** varredura de controles icon-only sem nome acessível nas páginas ativas.
  `src/pages/messenger/MessengerAccounts.tsx` tinha os piores casos — botões de
  **editar** e **excluir** conta (ícones lápis/lixeira) e o **fechar** do modal
  **sem `aria-label` nem `title`**: leitores de tela não anunciavam nada. Além disso,
  o campo de **busca** só tinha `placeholder` (não é nome acessível) e os `label`
  do formulário do modal **não estavam associados** aos inputs (sem `htmlFor`/`id`).
- **Mudado (componente ativo):**
  - editar conta → `aria-label="Editar conta <página>"` + `title`;
  - excluir conta → `aria-label="Excluir conta <página>"` + `title`;
  - fechar modal → `aria-label`/`title` "Fechar";
  - busca → `aria-label="Buscar contas"`;
  - cada `label` do modal ganhou `htmlFor` casado com o `id` do input correspondente.
- **Teste (TDD):** novo `MessengerAccounts.a11y.test.tsx` — escrito vermelho (4/4
  falhando) antes, verde depois. Cobre nomes acessíveis dos botões, do campo de busca
  e a associação label↔input via `getByLabelText`. Mocka só `useConfirm` do barrel de
  hooks (o barrel arrasta `import.meta` via useWebSocket→useStore→storeConfig).
- **Antes/depois:** 117→118 suítes, 482→486 testes; `tsc --noEmit` limpo nos dois lados.
## Baseline atual (2026-07-22)

- `npm ci`: ok. `npm audit` antes: 7 vulnerabilidades (1 low, 1 moderate, 5 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **484 testes / 117 suítes verdes**.
- `npm run build` (vite): **ok** (~14s).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (0 errors).

## Histórico

### 2026-07-22 — Segurança: `npm audit fix` (5 de 7 vulnerabilidades, incl. axios runtime)
- **Medido:** `npm audit` reportava **7 vulnerabilidades** (1 low, 1 moderate, 5 high).
  Destaque de risco real em runtime: **axios 1.16.1** com múltiplos CVEs high
  (prototype pollution em subcampos de auth, DoS por recursão em `formDataToJSON`,
  bypass de `maxBodyLength`) — axios é a base de toda a camada de API
  (`src/services/api.ts`, `src/services/onboarding.ts`).
- **Mudado:** `npm audit fix` **sem `--force`** (apenas bumps semver-compatíveis,
  zero breaking). Somente `package-lock.json` alterado (as faixas em `package.json`
  já cobriam as novas versões). Principais bumps:
  - `axios` 1.16.1 → **1.18.1** (corrige todos os CVEs high de axios);
  - `form-data`, `brace-expansion`, `js-yaml`, `@babel/core` → versões corrigidas.
- **Fora de escopo (breaking):** restam 2 vulnerabilidades transitivas
  **dev-only** — `esbuild`/`vite`, que só corrigem via `npm audit fix --force`
  (instala `vite@8`, major breaking). Afetam apenas o dev-server local, não o
  bundle de produção (Vercel builda estático). Adiado até validar upgrade do vite.
- **Zero-regressão:** tsc limpo, **484/484 testes verdes** e `vite build` ok
  antes e depois. Nenhum teste de unidade novo (bump de dependência não tem
  superfície de teste própria; a verificação é a suíte completa + build verdes).

#### Histórico anterior
## Baseline atual (2026-07-23)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **488 testes / 121 suítes verdes** (era 484/117; +4/+4 desta fatia).
- `npm run lint`: gate em 400 warnings; limpeza incremental em curso.

## Histórico

### 2026-07-23 — Acessibilidade: nomes acessíveis em botões icon-only de alto tráfego + conserto do mapper de CSS no Jest
- **Medido:** varredura de `<button>` icon-only (só ícone SVG, sem texto,
  `aria-label` ou `title`) nos fluxos mais usados. 14 candidatos reais; os de
  maior impacto ficavam nos **compositores dos inboxes** (enviar mensagem) e em
  controles frequentes. Leitores de tela não anunciavam esses controles.
- **Descoberta de infra:** `jest.config.cjs` mapeava CSS para `identity-obj-proxy`,
  mas o pacote **não estava instalado** — qualquer teste que renderizasse um
  componente com `import './x.css'` quebrava. Mapper dormente/quebrado.
- **Mudado (componentes ativos apenas):**
  - `WhatsAppInboxPage.tsx` (fluxo principal de WhatsApp): botão de enviar
    (`PaperAirplaneIcon`) → `aria-label="Enviar mensagem"` + `title`.
  - `InstagramInbox.tsx`: botão de enviar (`PaperAirplaneIcon`) → idem.
  - `EditOrderDrawer.tsx` (pedidos): botão de fechar (`XMarkIcon`) → `aria-label="Fechar"`
    (o irmão `NewOrderDrawer` já era rotulado).
  - `ui/toast.tsx` (app-wide): botão de dispensar (`XMarkIcon`) → `aria-label="Fechar notificação"`.
  - `identity-obj-proxy` adicionado como **devDependency** (conserta o mapper de CSS
    do Jest; desbloqueia testes de componentes que importam CSS).
- **Teste (TDD):** 4 novas suítes de acessibilidade, escritas **vermelhas antes,
  verdes depois** (verificado via `git stash` das correções → 4 falham → restaurar → 4 passam):
  `toast.a11y`, `EditOrderDrawer.a11y`, `WhatsAppInboxPage.a11y`, `InstagramInbox.a11y`.
  Os testes de inbox montam a página real e auto-selecionam a conversa (via
  `?conversation=` no WhatsApp e auto-seleção da 1ª no Instagram) para renderizar o compositor.
- **Antes/depois:** `npm test` 484/117 → **488/121**; tsc limpo nos dois lados.
  Só produção alterada: 4 atributos de acessibilidade (baixo risco, sem mudança de comportamento).
## Baseline atual (2026-07-24)

- `npm ci`: ok (9 vulnerabilidades reportadas pelo npm: 1 low, 3 moderate, 5 high).
  `npm audit` não consegue consultar o registry pelo proxy nesta execução (504),
  então a triagem de deps fica pendente para um ambiente com rede ao registry.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **489 testes / 118 suítes verdes** (após adicionar estado de erro na PaymentsPage).
- `npm run build` (tsc && vite build, igual à CI/Vercel): **ok**.
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
  - **Erro por SEÇÃO (refino pós-review do Codex):** cada query alimenta uma
    seção independente (stats → KPIs; orders → tabela). Uma query que falha SEM
    cache não cai mais no default zero/vazio da outra seção — a seção afetada
    mostra o próprio erro com retro; falha total (as duas sem cache) mantém o
    estado de erro de página inteira. O subtítulo "R$ X recebido" só aparece
    quando o stats tem dado.
  - Novo `src/pages/payments/__tests__/PaymentsPage.test.tsx` (5 casos): falha
    total + retry chama refetch; render normal em sucesso; só stats falha (erro
    nos KPIs, sem zeros, tabela intacta); só orders falha (erro na tabela, KPIs
    intactos); falha de atualização com cache nas duas → aviso não-bloqueante.
- **Antes/depois:** 484→489 testes, 117→118 suítes; tsc/build limpos nos dois
  lados; lint sem novos warnings nos arquivos tocados.
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
## Baseline atual (2026-07-26)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **505 testes / 122 suítes verdes** (após esta fatia; antes 502/121).
- `npm run lint`: gate em 400 warnings; **267 warnings** restantes (0 erros).

## Histórico

### 2026-07-26 — Acessibilidade: nomes acessíveis nos botões de ação do inbox + destravar teste de CSS
- **Medido:** auditoria de botões icon-only (só ícone/emoji, sem texto) em componentes
  efetivamente renderizados. Encontrados ~28 casos sem nome acessível. Priorizados os
  do fluxo principal do produto (inbox de mensagens — WhatsApp/Messenger/Instagram).
  Além disso, o `moduleNameMapper` de CSS do Jest apontava para `identity-obj-proxy`,
  pacote **não instalado**, o que quebrava qualquer teste de componente que importasse
  folha de estilo (nenhum teste conseguia cobrir esses componentes).
- **Infra (destrava testes):** `jest.config.cjs` passou a mapear CSS/SCSS para
  `src/__mocks__/styleMock.js` (stub local `{}`), removendo a dependência do pacote
  ausente. Zero regressão — nenhum teste dependia do comportamento de proxy de classes.
- **Mudado (componentes ativos):**
  - `MediaViewer.tsx` (visualizador de mídia do inbox WhatsApp): botões `⬇️` e `✕`
    ganharam `aria-label`/`title` ("Baixar mídia" / "Fechar visualização de mídia") e
    `type="button"`; `<img>` agora tem `alt` não-vazio mesmo sem `fileName` ("Mídia").
  - `WhatsAppInboxPage.tsx`, `MessengerInbox.tsx`, `InstagramInbox.tsx`: botão de
    enviar (`PaperAirplaneIcon`) recebeu `aria-label`/`title` "Enviar mensagem".
- **Teste (TDD):** novo `MediaViewer.a11y.test.tsx` — escrito vermelho antes, verde
  depois. Cobre nome acessível dos botões, disparo de `onClose` e `alt` da imagem.
- **Antes/depois:** 121→122 suítes, 502→505 testes; tsc limpo nos dois lados; lint 0 erros.
## Baseline atual (2026-07-27)

- `npm ci`: ok (10 vulnerabilidades reportadas pelo npm: 1 low, 3 moderate, 6 high).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **504 testes / 122 suítes verdes** (era 502/121 antes desta fatia; +2 testes de a11y do Toast).
- `npm run lint`: gate em 400 warnings; limpeza incremental em curso.
- **Nota de infra:** o clone veio com `HEAD` destacado em `10edb05` (6 commits à
  frente dos refs `main`/`origin/main` locais, defasados em `5f9b849`). Um
  `git fetch origin main` atualizou `origin/main` para `10edb05`; esta fatia foi
  rebaseada sobre o `origin/main` correto para não descartar os 6 commits reais
  (PDV balcão, etiquetas, impressão).

## Histórico

### 2026-07-27 — A11y: nomes acessíveis em botões icon-only (varredura ampliada)
- **Medido:** varredura por script (`grep` de `<button>` + heurística de ícone/texto)
  encontrou **14 botões icon-only ativos sem nome acessível** (sem `aria-label`,
  `title` nem texto visível). Leitores de tela não anunciavam nada nesses controles.
  5 ocorrências restantes eram falsos positivos (componentes base `Button`/`dropdown`
  que repassam `children`, ou botões que já têm texto — `MarketingPage.QuickAction`,
  `NewConversationModal`, `AgentDetailPage`).
- **Mudado (componentes ativos apenas):**
  - `ui/toast.tsx`: botão fechar → "Fechar notificação" (primitivo usado em todo o painel).
  - `whatsapp/WhatsAppInboxPage.tsx` e `instagram/InstagramInbox.tsx`: botão enviar →
    "Enviar mensagem" (workflows principais de mensageria).
  - `orders/EditOrderDrawer.tsx`, `agents/AgentForm.tsx`: fechar → rótulo descritivo.
  - `messaging/ConnectionsPage.tsx`, `messenger/MessengerAccounts.tsx`: fechar diálogo → "Fechar".
  - `customers/CustomersPage.tsx`, `dashboard/DashboardPage.tsx`, `agents/AgentsPage.tsx`,
    `automation/AutomationLogsPage.tsx`: atualizar → rótulo descritivo.
  - `automation/CompanyProfileDetailPage.tsx`: copiar/regenerar chave de API → rótulos.
  - `agents/AgentChatTest.tsx`, `agents/UnifiedOrchestratorTest.tsx`: enviar/limpar → rótulos.
  - `Sidebar.tsx` deliberadamente **não** alterado (legado morto, não renderizado).
- **Teste (TDD):** novo `ui/__tests__/toast.a11y.test.tsx` — escrito vermelho antes,
  verde depois. Cobre o nome acessível e o `onClose` do botão de fechar do Toast
  (primitivo compartilhado, maior alcance).
- **Correção pós-review (Codex):** a heurística do scanner só pegava botões com
  filho de **ícone** (`<XxxIcon>`); o `Toggle` de `ConnectionsPage.tsx` é um
  `<button>` cujo único filho é um `<span>` visual (o "pino" do switch), então
  passou batido — era um controle **sem nome nem estado** numa rota central.
  Extraído para `messaging/Toggle.tsx` com `role="switch"` + `aria-checked` +
  `aria-label` (nome com ação/loja, ex.: "Desativar conexão Loja Principal") e
  coberto por `messaging/__tests__/ConnectionsToggle.a11y.test.tsx` (TDD).
  Portanto a varredura **não** está 100% limpa: falta ainda dar nome acessível
  ao primitivo compartilhado `components/common/Switch.tsx` (tem `role`/`aria-checked`
  mas nenhum `aria-label`) — anotado nos próximos passos.
- **Antes/depois:** 121→123 suítes, 502→506 testes; tsc limpo nos dois lados.
- `npm test`: **460 testes / 110 suítes verdes** (após esta execução; era 457/109 antes).
- `npm run lint`: gate em 400 warnings; **272 warnings** restantes (0 errors).

## Histórico

### 2026-07-20 — Acessibilidade: toast do painel vira live region + botão de fechar com nome acessível
- **Medido:** varredura de botões icon-only sem nome acessível encontrou 26 candidatos.
  O de maior alavancagem é o toast **`src/components/molecules/Toast.tsx`** — é o
  componente de notificação renderizado em todo o painel via `ToastContext`
  (`src/context/ToastContext.tsx`). Duas lacunas de a11y:
  1. o botão de fechar era **icon-only** (`<XMarkIcon>`) sem `aria-label` e sem
     `type="button"` — leitores de tela não anunciavam nada;
  2. o toast **não era live region** — leitores de tela não anunciavam a
     notificação ao aparecer (nenhum `role`/`aria-live`).
  (Nota: existe também um `src/components/ui/toast.tsx` com a mesma lacuna, mas ele
  **não é o renderizado pelo contexto** — o vivo é o de `molecules`. Deixado para
  uma próxima fatia junto de outros icon-only pendentes.)
- **Mudado (`src/components/molecules/Toast.tsx`):**
  - toast agora é live region: `role="alert"` + `aria-live="assertive"` para
    `type="error"` (interrompe), `role="status"` + `aria-live="polite"` para os
    demais, com `aria-atomic="true"`;
  - botão de fechar: `type="button"` + `aria-label="Fechar notificação"`, ícone
    marcado `aria-hidden`, e anel de foco visível (`focus-visible:ring-2`) no lugar
    do `focus:outline-none` que apagava o foco de teclado.
- **Teste (TDD):** novo `src/components/molecules/__tests__/Toast.a11y.test.tsx` —
  escrito vermelho antes (3/3 falhando), verde depois. Cobre nome acessível do
  botão de fechar, `role="alert"`/assertive em erro e `role="status"`/polite em sucesso.
- **Antes/depois:** `npm test` 457/109 → **460/110** verdes; tsc limpo nos dois lados;
  lint estável em 272 warnings (0 errors). Sem alteração de comportamento visual.
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

1. **Segurança/deps (fatia rápida e segura):** aplicar `npm audit fix` (não-`--force`)
   para o `form-data` (high, CRLF injection) e `js-yaml` (moderate) — sem breaking
   change. Deixar `vite`/`esbuild` (só via `--force`, sobe pra vite@8) para uma fatia
   dedicada com validação de build.
2. **A11y — continuar varredura:** próximos alvos `NewWhatsAppCampaignPage`,
   `InstagramInbox` e `ConnectionsPage` (os botões de ação lá têm `title`, que já dá
   nome acessível de fallback, mas o `Modal` de QR/fechar merece revisão). Adicionar
   teste de regressão por componente conforme tocar.
   - **Nota de segurança (OK):** `ConnectionsPage` renderiza SVG de QR como `<img>`
     (`data:image/svg+xml`), **não** via `dangerouslySetInnerHTML` — sem XSS. `tokenStorage`
     centraliza a leitura do token (sem parse solto de localStorage).
1. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps (restante):** planejar upgrade de `vite@5 → vite@8` (breaking)
   para eliminar as 2 vulnerabilidades dev-only de `esbuild`/`vite`. Validar
   `vite.config.ts`, plugins e o transform de teste antes de aplicar.
1. **A11y — continuar varredura:** ainda restam botões icon-only sem nome acessível
   (levantados na varredura de 2026-07-23): `DashboardPage`/`CustomersPage`/`AgentsPage`/
   `AutomationLogsPage` (refresh `ArrowPathIcon`), `ConnectionsPage`/`MessengerAccounts`/
   `AgentForm` (fechar `XMarkIcon`), `CompanyProfileDetailPage` (copiar/regenerar API key),
   `AgentChatTest` (enviar). Rotular conforme tocar, com teste de regressão por componente.
1. **A11y — continuar varredura (backlog auditado):** ~22 botões icon-only restantes
   sem nome acessível, agora destrancados para teste (mapper de CSS corrigido).
   Priorizar os botões **fechar/dismiss** de diálogos: `EditOrderDrawer` (`XMarkIcon`),
   `ConnectionsPage`, `MessengerAccounts` (fechar + editar/excluir linha), `AgentForm`,
   `IntentLogsPage`, `WhatsAppCampaignsPage`, `NewCampaignPage` (email, `✕`). Depois:
   botão de enviar do `AgentChatTest`, voltar (`ArrowLeftIcon`) nas telas de agentes/
   marketing, copiar/regenerar API key em `CompanyProfileDetailPage`, refresh do
   `DashboardPage`. Adicionar teste de regressão por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
1. **A11y — continuar varredura:** ~78 botões icon-only sem nome acessível ainda
   pendentes (varredura por código, robusta a `=>` em atributos). Próximos alvos de
   maior tráfego: `DashboardPage.tsx` (botão de refresh no banner de pendentes, linha
   ~340), `OrderDetailContent.tsx`, `AgentsPage.tsx`, `AccountsPage.tsx`. Adicionar
   teste de regressão de acessibilidade por componente conforme tocar.
1. **A11y — próximas camadas:** nomes acessíveis em botões icon-only cobertos
   (só restam falsos positivos no scanner de ícones). Pendências conhecidas:
   (a) `components/common/Switch.tsx` — switch compartilhado com `role`/`aria-checked`
   mas sem `aria-label`; dar nome via prop e propagar aos consumidores;
   (b) `role="status"`/`aria-live` no `Toast` para que notificações sejam anunciadas
   por leitores de tela; (c) foco/`aria-modal`/trap de foco nos diálogos
   (`ConnectionsPage`, `MessengerAccounts`, `EditOrderDrawer`); (d) `aria-label` em
   `<select>`/inputs sem label associado. Obs.: a heurística do scanner só detecta
   botões com filho de ícone — controles cujo filho é só um `<span>` visual
   (toggles/switches) precisam de auditoria à parte.
2. **Segurança/deps:** triar as 10 vulnerabilidades do `npm audit` (1 low, 3
   moderate, 6 high) e aplicar `npm audit fix` sem breaking changes.
1. **A11y — continuar varredura de icon-only:** ainda restam ~25 candidatos sem nome
   acessível (levantados por script nesta execução). Priorizar os de maior alcance:
   `src/components/ui/toast.tsx` (gêmeo do já corrigido, mas não renderizado hoje),
   `src/components/ui/dropdown.tsx`, `modal.tsx`, e páginas
   (`CustomersPage`, `CompanyProfileDetailPage`, `AutomationLogsPage`,
   `WhatsAppInboxPage`, `MarketingPage`). Teste de regressão a11y por componente.
2. **Segurança/deps:** triar as 5 vulnerabilidades do `npm audit` (1 low, 2 moderate,
   2 high). A `high` de `form-data` tem `npm audit fix` sem breaking change — candidata
   segura. A de `esbuild`/`vite` exige major (vite@8) — avaliar à parte.
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
4. **Lint:** reduzir warnings restantes (260) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1873 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1706 linhas) para code-splitting/extração.
