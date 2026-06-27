# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-06-27)

- `npm ci`: ok (22 vulnerabilidades reportadas pelo npm — ver backlog).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **334 testes / 78 suítes verdes** (humanos adicionaram a Fase 3 de
  pagamentos desde o último loop; o número antigo 309/73 estava defasado).
- `npm run lint`: gate em 400 warnings; **269 warnings** restantes (0 erros).

## Histórico

### 2026-06-27 — Cópia para área de transferência resiliente (UX correctness + a11y de contexto inseguro)
- **Medido:** auditoria de `navigator.clipboard` no código — **9 chamadas**
  espalhadas e inconsistentes. Padrões problemáticos encontrados:
  - `navigator.clipboard.writeText(...)` direto (lança `TypeError` em contexto
    inseguro/HTTP ou navegador legado, sem `try/catch` na maioria);
  - `navigator.clipboard?.writeText(...)` (falha silenciosa mas **mostrava toast
    de sucesso mesmo sem copiar nada**);
  - nenhuma tratava a rejeição da promise (permissão negada) — todas afirmavam
    "copiado!" independentemente do resultado real.
- **Mudado:**
  - Novo utilitário `src/utils/clipboard.ts` → `copyToClipboard(text): Promise<boolean>`:
    tenta a Async Clipboard API e **aguarda** o resultado; cai para fallback
    `document.execCommand('copy')` via `<textarea>` temporário (cobre HTTP e
    navegadores legados); retorna `true`/`false` para feedback correto.
  - Refatorados os 8 call sites para `await` + toast condicional (sucesso real vs.
    "Não foi possível copiar. Copie manualmente."): `PaymentLinkPage`,
    `OrderDetailPage`, `ContactInfoPanel`, `CompanyProfileDetailPage` (2x),
    `CompanyProfilesPage`, `PrintSettingsPage`, `PaymentsPage`, `useNewOrderWizard`.
- **Teste (TDD):** novo `clipboard.test.ts` — escrito vermelho antes, verde depois.
  Cobre: API disponível (true), API ausente → fallback, API rejeita → fallback,
  ambos falham → false.
- **Antes/depois:** 77→78 suítes, 330→334 testes; tsc limpo nos dois lados; lint 0 erros.

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
   (`InstagramInbox`) e diálogos. Adicionar teste de regressão de acessibilidade
   por componente conforme tocar.
2. **Segurança/deps:** triar as 22 vulnerabilidades do `npm audit` (1 low, 19
   moderate, 2 high) e aplicar `npm audit fix` sem breaking changes.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
