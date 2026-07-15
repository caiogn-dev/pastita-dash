# Evolução do Cardapidex Dashboard

Backlog priorizado e histórico do loop diário de evolução. Cada execução entrega
uma fatia de valor com disciplina de TDD e zero-regressão (tsc limpo + testes verdes).

## Baseline atual (2026-07-15)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **425 testes / 104 suítes verdes**.
- `npm run build`: **ok** (build de produção conclui).
- `npm run lint`: gate em 400 warnings; **273 warnings** restantes (limpeza incremental em curso).
- `npm audit`: **2 vulnerabilidades** (1 moderate + 1 high), ambas na cadeia
  `esbuild`/`vite` — só resolvem com bump major para `vite@8` (breaking), deixado
  para upgrade dedicado e validado.

## Histórico

### 2026-07-15 — Segurança: `npm audit fix` sem breaking changes (5 → 2 vulnerabilidades)
- **Medido:** baseline verde (tsc limpo, 425/104 testes). `npm audit` reportava
  **5 vulnerabilidades** (1 low, 2 moderate, 2 high), todas em dependências de
  build/dev transitivas: `form-data` (high, CRLF injection em multipart),
  `@babel/core` (leitura arbitrária de arquivo via `sourceMappingURL`),
  `js-yaml` (DoS de complexidade quadrática em merge keys) e a cadeia
  `esbuild`/`vite` (moderate).
- **Mudado:** `npm audit fix` **sem `--force`** — aplica apenas correções
  dentro do range semver (não altera `package.json`, só o `package-lock.json`;
  131 inserções / 98 remoções no lock). Remove `form-data`, `@babel/core` e
  `js-yaml`. A cadeia `esbuild`/`vite` **não** foi tocada porque só resolve com
  `vite@8.1.4` (major/breaking) — risco ao build de produção, deixado para
  upgrade dedicado com validação própria.
- **Zero-regressão:** `package.json` inalterado; suíte completa **425/425**
  igual antes/depois; `tsc --noEmit` limpo; `npm run build` conclui. Nenhum
  código de aplicação alterado — só o lockfile.
- **Antes/depois:** `npm audit` **5 → 2 vulnerabilidades** (removidos ambos os
  highs de código + 1 moderate; restam 1 moderate + 1 high só em `esbuild`/`vite`).

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

1. **Segurança/deps — cadeia `vite`/`esbuild`:** restam 2 vulnerabilidades que só
   resolvem com `vite@8` (major/breaking; altera plugins e config de build).
   Fazer upgrade dedicado, testando `npm run build` e `npm run dev` a fundo antes
   de mesclar. NÃO aplicar `audit fix --force` às cegas.
2. **A11y — continuar varredura:** botões icon-only em páginas de marketing/instagram
   (`NewWhatsAppCampaignPage`, `InstagramInbox`) e diálogos. Adicionar teste de
   regressão de acessibilidade por componente conforme tocar.
3. **React Router v7 readiness:** avaliar `future` flags (`v7_startTransition`,
   `v7_relativeSplatPath`) no `BrowserRouter` — silencia warnings nos testes, mas
   `v7_relativeSplatPath` altera resolução de rotas splat; precisa validação.
4. **Lint:** reduzir warnings restantes (273) rumo a baixar o teto de `--max-warnings`.
5. **Bundles pesados:** investigar `storesApi.ts` (1833 linhas) e
   `NewWhatsAppCampaignPage.tsx` (1704 linhas) para code-splitting/extração.
