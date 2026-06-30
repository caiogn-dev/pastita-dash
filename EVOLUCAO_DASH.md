# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-06-26)

- `npm ci`: ok (22 vulnerabilidades reportadas pelo npm — ver backlog).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **333 testes / 78 suítes verdes**.
- `npm run lint`: gate em 400 warnings; **269 warnings** restantes (limpeza incremental em curso).

## Histórico

### 2026-06-26 — Acessibilidade: botões icon-only do Instagram Inbox + infra de teste de CSS
- **Medido:** varredura de botões "icon-only" em `InstagramInbox.tsx` (fluxo de DM
  do Instagram). O botão **enviar mensagem** (`PaperAirplaneIcon`) não tinha
  nenhum nome acessível — leitores de tela anunciavam apenas "button". Refresh,
  templates e ferramentas tinham só `title` (anúncio pouco confiável em alguns SR).
- **Mudado (`InstagramInbox.tsx`):**
  - Botão enviar mensagem → `aria-label`/`title` "Enviar mensagem".
  - Botão atualizar conversas → `aria-label` "Atualizar conversas" (além do title).
  - Botões templates/ferramentas → `aria-label` + `aria-pressed` refletindo o
    painel ativo (estado de toggle agora exposto a tecnologia assistiva).
- **Infra de teste:** `jest.config.cjs` referenciava `identity-obj-proxy` que
  **não estava instalado** — qualquer componente que importa CSS quebrava no Jest.
  Criado stub local `src/test/styleMock.cjs` (Proxy, sem dependência nova) e
  apontado o `moduleNameMapper`. Isso destrava testes de render para páginas com
  CSS (como esta).
- **Teste (TDD):** novo `InstagramInbox.a11y.test.tsx` — escrito vermelho antes
  (botão enviar sem nome), verde depois. Renderiza o inbox com serviços mockados
  (conversa auto-selecionada) e assere nomes acessíveis nos 4 botões icon-only.
- **Antes/depois:** 77→78 suítes, 330→333 testes; tsc limpo nos dois lados;
  lint 269 warnings (sob o gate de 400).

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

1. **A11y — continuar varredura:** `InstagramInbox` concluído (2026-06-26).
   Pendentes: botões icon-only em `NewWhatsAppCampaignPage` (voltar/`ArrowLeftIcon`
   linha ~743 e remover contato/`TrashIcon` linha ~1359, ambos sem nome acessível)
   e diálogos. Com o `styleMock.cjs` no lugar, agora dá para escrever testes de
   render para mais páginas. Adicionar teste de regressão por componente ao tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
