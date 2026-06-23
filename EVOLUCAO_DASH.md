# Evolução do pastita-dash

Registro do loop diário de evolução do painel administrativo do Cardapidex.
Cada execução entrega uma fatia de valor com disciplina de zero-regressão
(testes antes/depois + `npx tsc --noEmit` limpo, pois a Vercel builda a `main`).

## Baseline medido (2026-06-23)

- `npm ci`: ok.
- `npx tsc --noEmit`: **limpo** (0 erros).
- `npm test` (antes): **14 testes vermelhos** em 1 suíte
  (`src/components/Combos/__tests__/ComboForm.test.tsx`) — 244/258 passando.
- `npm test` (depois): **258/258 verdes**, 58/58 suítes.

## Histórico

### 2026-06-23 — Corrigir suíte vermelha do ComboForm (testes obsoletos)
- **Problema:** os 14 testes falhando referenciavam uma UI antiga
  (botão único "Adicionar Item"). O componente `ComboForm.tsx` evoluiu para
  dois botões — "Grupo de variantes" e "Grupo de produtos" — com grupos que
  já abrem expandidos. Os testes não acompanharam essa evolução.
- **Decisão:** o componente é a fonte da verdade (evoluiu deliberadamente);
  atualizei os testes para o contrato atual em vez de mexer no componente de
  produção (zero risco de regressão funcional).
- **Mudanças (apenas no arquivo de teste):**
  - Troca de `getByText(/Adicionar Item/i)` por
    `getByRole('button', { name: /Grupo de variantes/i })` no fluxo de variantes.
  - Asserção de "renderiza aba de itens" passa a checar os dois botões reais.
  - Teste de remoção de grupo usa o marcador estável `title="Remover grupo"`
    (evita ambiguidade entre o cabeçalho "Selecionar produto" e a option
    "Selecionar produto..." do `<select>`).
- **Métrica:** testes 244→258 verdes; `tsc` permanece limpo.

## Próximo passo priorizado

1. **Acessibilidade do ComboForm:** as "abas" (`Informações/Itens/Configurações`)
   são `<button>` sem semântica `role="tab"`/`aria-selected`; os toggles
   ("Obrigatório", "Combo ativo", etc.) são `<div onClick>` sem `role`/teclado.
   Migrar para padrões acessíveis (Headless UI já está no projeto) é a próxima
   fatia de maior valor.
2. Varrer demais formulários grandes (Stores, Products) atrás dos mesmos
   antipadrões de toggle `<div onClick>` sem foco/teclado.
