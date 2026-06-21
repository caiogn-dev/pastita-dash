# Evolução do pastita-dash — Backlog & Histórico

Loop diário de evolução do painel administrativo do Cardapidex (React + TS + Vite,
deploy Vercel na `main`). Uma fatia de valor por execução, sem quebrar produção.

## Como ler este arquivo

- **Baseline**: rodar `npm ci`, `npm test` (Jest) e `npx tsc --noEmit` antes de mexer.
- **Disciplina**: TDD + zero-regressão. tsc precisa ficar limpo (senão a Vercel não builda).
- **Convenções do repo**: mutações de loja via `storesApi`; status de produto
  `'active' | 'inactive'`; campo `featured` (não `is_featured`); navegação real é
  `Navbar.tsx` (Sidebar.tsx é legado morto). Commits e PRs em português.

---

## Histórico (mais recente primeiro)

### 2026-06-21 — Suíte de testes de volta ao verde (ComboForm)
- **Medido (antes)**: `npm test` vermelho — `ComboForm.test.tsx` com 14 de 26
  testes falhando (244/258 passando). `npx tsc --noEmit` já estava limpo.
- **Causa-raiz**: o `ComboForm` foi refatorado do modelo antigo (botão único
  "Adicionar Item", produto por item) para o modelo de **grupos** ("Grupo de
  variantes" / "Grupo de produtos"), mas os testes ficaram presos à UI antiga —
  procuravam textos que não existem mais (`Adicionar Item`, etc.). Eram testes
  obsoletos, não um bug de produto.
- **Mudança**: realinhei os 14 testes ao componente atual sem enfraquecer
  asserções — botões de adicionar grupo via `getByRole`, seleção de produto,
  tabela de variantes (max/override), toggle de duplicatas, validação e submit.
  Ajustei "remove group" para usar o botão "Remover grupo" (evita match ambíguo
  entre o header e a `<option>` "Selecionar produto...").
- **Medido (depois)**: `npm test` 258/258 verdes; `npx tsc --noEmit` limpo.
- **Por que importa**: baseline vermelho mascara regressões futuras e quebra a
  disciplina de zero-regressão. Restaurar o sinal verde é fundação para os
  próximos incrementos.

---

## Backlog priorizado (aberto)

1. **Acessibilidade dos toggles do ComboForm** — os "checkboxes" de Obrigatório,
   Permitir duplicatas, Combo ativo, Destaque e Controlar estoque são `<div>` com
   `onClick`, sem `role="checkbox"`/`aria-checked`/foco por teclado. Migrar para
   elementos acessíveis (ou `role`+`tabIndex`+`onKeyDown`) e cobrir com teste.
2. **Auditoria de `aria`/foco na navegação real (`Navbar.tsx`)** — dropdowns via
   portal: validar foco, `aria-expanded`, fechamento por `Esc` e navegação por
   teclado.
3. **Cache/dedup de chamadas de API** — mapear telas que refazem fetch ao trocar
   de loja sem React Query (ex.: `ProductsPage` recarrega por `storeId`); avaliar
   `useQuery` com `queryKey` por loja para evitar refetch redundante.
4. **Token em storage / segurança** — revisar onde o token DRF é guardado
   (localStorage vs memória) e risco de XSS no render de mensagens de mídia
   (regra do CLAUDE.md: nunca renderizar `message.content` se não for string).
5. **Bundle/peso** — checar imports pesados (recharts + chart.js coexistindo?,
   reactflow) e oportunidades de code-splitting por rota.
6. **Vazamento entre tenants** — auditar fallbacks de slug e estados que
   persistem ao trocar de loja.

> Próximo passo sugerido: item **1** (acessibilidade dos toggles do ComboForm) —
> escopo pequeno, alto valor de a11y, e já temos o arquivo de testes aquecido.
