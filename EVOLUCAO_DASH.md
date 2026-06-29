# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-06-29)

- `npm ci`: ok (vulnerabilidades reportadas pelo npm — ver backlog).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **331 testes / 77 suítes verdes** (após correção abaixo).
- `npm run lint`: gate em 400 warnings; ~266 warnings restantes (limpeza incremental em curso).

## Histórico

### 2026-06-29 — Correção: testes vermelhos da PaymentLinkPage na main
- **Medido:** o baseline encontrou a `main` com **3 testes vermelhos** em
  `PaymentLinkPage.test.tsx` (76/77 suítes, 327/330 testes). O commit `3b72fc8`
  redesenhou a `PaymentLinkPage` para gerar um **link de pagamento real** (Checkout
  Pro: cartão/PIX/boleto via `payment.payment_url`/`init_point`) em vez de um PIX
  copia-e-cola, e renomeou o botão para "Gerar link de pagamento" — mas os testes
  ficaram presos no contrato antigo (`pix_code`, QR, `ticket_url`, botão "Gerar
  cobrança PIX"). Risco: suíte vermelha mascara regressões futuras.
- **Mudado:** `PaymentLinkPage.test.tsx` atualizado para o contrato vigente
  (fonte da verdade = componente intencionalmente alterado): novo label do botão,
  asserção sobre `payment_url` e o link "Abrir link de pagamento". Adicionado caso
  extra cobrindo o fallback para `init_point` quando `payment_url` não vem na resposta.
  **Sem alteração de código de produção** (apenas testes).
- **Antes/depois:** 327→331 testes verdes, 76→77 suítes; tsc limpo nos dois lados.

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
