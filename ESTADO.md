# ESTADO — Painel pastita-dash (`caiogn-dev/pastita-dash`)

> **Fonte única de verdade** do que está FEITO, EM ANDAMENTO e no BACKLOG.
> Todo PR que mexe no painel **atualiza este arquivo no mesmo PR**.
> Loops e sessões: **NÃO** peguem item em `FEITO` nem em `EM ANDAMENTO`. Ao começar
> algo, mova-o para `EM ANDAMENTO` (data + quem) no mesmo PR — "reserva" o item e
> evita refazer (bug de versão).

**Trunk:** `main` (push na `main` = **deploy de PRODUÇÃO** na Vercel; erro de TS bloqueia o build).
**Regra dura:** trunk só avança por **PR revisado**. NUNCA `push` direto na `main`. NUNCA `--force`.

---

## ✅ FEITO — NÃO REFAZER

### SaaS Fase 1 — UI de cobrança (2026-06-30, em produção)
- `src/services/billing.ts` — `getSubscription` / `cancelSubscription` / `changePlan` + `getPlans` + tipo `SubscriptionStatus`.
- `src/pages/plano/SubscriptionManagementPage.tsx` — rota **`/assinatura`** (status + cards de plano p/ trocar + cancelar). Item no menu da conta (`AccountMenu.tsx`).
- `src/components/billing/PaywallModal.tsx` — modal de upgrade ao bater no limite de produtos (dispara no 400 `limite do plano` do backend), integrado no `ProductFormModal.tsx`.
- `src/components/layout/TrialBanner.tsx` — estendido p/ `suspended`/`past_due` (faixa vermelha + CTA `/assinatura`), mantendo o trial intacto.
- Onboarding self-service `/cadastro` (trial) já existia.

### ⚠️ O que está GATED/OFF no backend (NÃO é bug do painel)
- **Taxa de adesão (setup fee) no pagamento:** backend tem, mas `BILLING_SETUP_FEE_ENABLED=OFF` → não aparece no checkout até ligar (Task 13 ops, envolve dinheiro real).
- **Cobrança automática:** `BILLING_AUTOCHARGE_ENABLED=OFF`.

### ❌ NÃO existe ainda (é Fase 2/3, não foi feito)
- **Wizard de setup / tour de onboarding** = **Fase 2** (plano próprio, ainda não iniciado).
- Aquisição (pricing/landing novos) = Fase 3.

---

## 🚧 EM ANDAMENTO
- Hotfix `fix(dash)`: spinner infinito em `/assinatura` quando não há loja selecionada (branch `fix/subscription-page-no-store`). Ainda **não mergeado** na `main`. NÃO duplicar.

---

## 📋 BACKLOG (prioridade — meta: dinheiro-primeiro → guiar → adquirir)
- **P0:** bugs que quebram fluxo; erros de TS (bloqueiam Vercel); vazamento de token/dados entre tenants (XSS, token em storage, slug hardcoded).
- **P1 — Fase 2 (guiar o lojista):** wizard de setup pós-cadastro, tour, estados vazios úteis. Acessibilidade (aria/foco/contraste — ex.: focus-trap no PaywallModal).
- **P2:** performance (bundles, re-renders, chamadas de API redundantes/sem cache — React Query já existe; ex.: `getSubscription` é chamado em duplicado pelo banner e pela página).
- **P3:** UX consistente (trocar `window.confirm` do cancelamento por modal), código morto.

---

## Convenções
- TDD + zero-regressão: teste **primeiro**, suíte **antes e depois**; `npx tsc --noEmit` limpo (senão Vercel não builda).
- Mutações de loja via `storesApi` (não `products.ts`); status `'active'|'inactive'`; campo `featured` (não `is_featured`).
- Navegação real é `Navbar.tsx` (`Sidebar.tsx` é legado morto). Use `useStore()`, nunca slug hardcoded.
- Commits e PRs **em português**. PR: `gh pr create` (nunca push direto na `main`).
