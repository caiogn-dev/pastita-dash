# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

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

1. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
2. **Segurança/deps (restante):** planejar upgrade de `vite@5 → vite@8` (breaking)
   para eliminar as 2 vulnerabilidades dev-only de `esbuild`/`vite`. Validar
   `vite.config.ts`, plugins e o transform de teste antes de aplicar.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (~266) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
