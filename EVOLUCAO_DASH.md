# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-06-28)

- `npm ci`: ok (vulnerabilidades reportadas pelo npm — ver backlog).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **332 testes / 77 suítes verdes** (após o fix de hoje; estava 327/330 com 3 falhas).
- `npm run lint`: gate em 400 warnings; ~266 warnings restantes (limpeza incremental em curso).

## Histórico

### 2026-06-28 — Correção: suíte vermelha em `PaymentLinkPage` (regressão de teste)
- **Medido:** ao rodar `npm test` na main, a suíte estava **vermelha** —
  `PaymentLinkPage.test.tsx` com 3 testes falhando (3 failed / 327 passed). A Vercel
  só bloqueia build por erro de TypeScript (tsc estava limpo), então produção não
  quebrou, mas a disciplina de zero-regressão estava furada na main.
- **Causa:** o commit `3b72fc8` reescreveu a `PaymentLinkPage` para gerar um **link
  real do Checkout Pro** (cartão/PIX/boleto via `payment.payment_url`/`init_point`),
  abandonando o fluxo antigo de PIX copia-e-cola (`pix_code`/`pix_qr_code`/QR) e
  renomeando o botão para "Gerar link de pagamento". Os testes não foram atualizados
  e continuavam afirmando o comportamento antigo.
- **Mudado:** reescrita de `PaymentLinkPage.test.tsx` alinhada ao comportamento
  intencional atual (componente é a fonte da verdade). Cobertura ampliada de 3→5 casos:
  - gera link e exibe a URL + botão "Abrir link de pagamento" com `href` correto;
  - usa `init_point` como fallback quando `payment_url` está ausente (novo);
  - exibe `toast.error` quando o backend não retorna URL (novo, caminho de erro);
  - não chama o serviço com valor inválido;
  - envia pagador opcional (nome **e e-mail**) quando preenchido.
- **Antes/depois:** testes 327 verdes / 3 vermelhos → **332 verdes / 0 vermelhos**;
  76→77 suítes verdes; tsc limpo nos dois lados.

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

1. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
