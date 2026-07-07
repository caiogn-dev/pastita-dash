# Evolução do pastita-dash

Registro do loop diário de evolução do painel (Cardapidex Dashboard — React + TS + Vite).
Cada execução entrega uma fatia de valor com TDD e zero-regressão, sem quebrar produção
(push na `main` = deploy de produção na Vercel; erro de TS bloqueia o build).

## Baseline medido (2026-07-07)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo** (0 erros).
- `npm test` (antes): **1 suíte falhando, 14 testes vermelhos** de 258
  (`src/components/Combos/__tests__/ComboForm.test.tsx`).
- `npm test` (depois): **258/258 verdes, 58 suítes**.

## Histórico

### 2026-07-07 — Testes do ComboForm alinhados ao componente refatorado
- **Problema:** a suíte `ComboForm.test.tsx` testava uma UI antiga (botão único
  "Adicionar Item", grupos expandidos por padrão, campos `required`/`allow_duplicates`).
  O componente foi refatorado para dois botões ("Grupo de variantes" / "Grupo de produtos"),
  grupos colapsáveis e campos `is_required` / `allow_duplicate_variants`. Resultado:
  14 testes quebrados dando falso-vermelho no `npm test` (zero sinal de regressão real).
- **Mudança (test-only, zero risco de produção):** reescrita dos 14 testes para exercitar
  o componente atual — seleção de produto via `getByDisplayValue('Selecionar produto...')`,
  edição de `max_selections`/`price_override` escopada por linha com `within(row)`,
  toggles `Obrigatório`/`Permitir duplicatas`, e submissão validando o payload `groups`.
- **Métricas:** testes 244✅/14❌ → **258✅/0❌**; `tsc --noEmit` seguiu limpo.
- **Arquivos:** `src/components/Combos/__tests__/ComboForm.test.tsx`.

## Backlog priorizado (próximos passos)

1. **Acessibilidade dos toggles do ComboForm.** Os "checkboxes" de Obrigatório /
   Permitir duplicatas / Combo ativo são `div`s clicáveis sem `role="checkbox"`,
   `aria-checked` nem foco por teclado. Converter para elementos acessíveis
   (mantendo o visual) e cobrir com testes de teclado/aria. *(alto valor a11y)*
2. **Segurança: token em storage.** Auditar onde o token DRF é persistido
   (localStorage/sessionStorage) e o risco de XSS/vazamento entre tenants.
3. **Estados de loading/erro ausentes.** Varredura por telas que fazem fetch sem
   skeleton/tratamento de erro (começar por `OrdersPage`, `WhatsAppChatPage`).
4. **Chamadas de API redundantes / cache.** Revisar uso de React Query
   (`staleTime`, `queryKey` por tenant) para evitar refetch desnecessário.
5. **Bundle/performance.** Medir chunks pesados via `vite build --report` e avaliar
   code-splitting de páginas grandes (reactflow, chart.js, recharts coexistem).
6. **Código morto.** `Sidebar.tsx` é legado não-renderizado; avaliar remoção segura.
