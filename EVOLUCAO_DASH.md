# EVOLUCAO_DASH — Loop diário de evolução do pastita-dash

Backlog priorizado e histórico do painel administrativo do Cardapidex.
Cada execução entrega **uma fatia de valor** sem quebrar produção
(push na `main` = deploy de produção na Vercel; erro de TS bloqueia o build).

## Baseline medido (2026-06-22)

- `npm ci`: ok (Node 22, npm 10).
- `npx tsc --noEmit`: **limpo** (exit 0).
- `npm test` (Jest): **vermelho pré-existente** — 14 testes falhando em
  `src/components/Combos/__tests__/ComboForm.test.tsx` (1 suíte de 58).
  Causa: os testes foram escritos para um modelo antigo do `ComboForm`
  (botão único "Adicionar Item", grupos genéricos) que **não existe mais**.
  O componente evoluiu para dois tipos de grupo:
  - **Grupo de variantes** (produto-âncora + tabela de variantes)
  - **Grupo de produtos** (título + checklist de produtos)
  Os 244 testes restantes passavam.

## Feito

### 2026-06-22 — Restaurar a suíte verde do ComboForm (testes obsoletos)
PR: `bot/evolucao-2026-06-22-combo-tests`

- **Problema:** suíte vermelha mascara regressões futuras e quebra o sinal de
  qualidade. As 14 falhas eram testes desatualizados, não bug de produção.
- **O que mudou:** reescrita de `ComboForm.test.tsx` para o contrato atual:
  - helpers `goToItemsTab` / `addVariantGroup` / `addProductGroup`;
  - cobertura do fluxo de **grupo de variantes** (selecionar produto-âncora,
    tabela de variantes, editar `max_selections` e `price_override`,
    toggles `Obrigatório` e `Permitir duplicatas de variantes`);
  - **+2 testes novos** cobrindo o caminho de **grupo de produtos**
    (título + checklist + seleção de opção), antes sem nenhuma cobertura.
  - Asserções dos botões de adicionar grupo passam a usar `getByRole('button')`
    em vez de `getByText`, evitando colisão com o texto de um **toast vazado
    entre testes** (`"...(grupo de produtos)"`).
- **Métricas antes/depois:**
  - Antes: 244 passando / 14 falhando (258 total), 1 suíte vermelha.
  - Depois: **260 passando / 0 falhando** (260 total), 58 suítes verdes.
  - `npx tsc --noEmit`: limpo antes e depois.

## Próximos passos priorizados

1. **Higiene de toasts nos testes (infra):** há um toast do react-hot-toast
   que vaza entre testes (o portal persiste no `document.body`). Adicionar um
   `afterEach` global em `src/setupTests.ts` que limpe os toasts
   (ex.: `toast.remove()` + unmount do portal) para evitar colisões de texto
   e flakiness em futuras suítes. Baixo risco, alto retorno de robustez.
2. **Cobertura de submit do grupo de produtos:** garantir via teste que o
   payload de `groups` para grupo de produtos envia `product_id: null`,
   `title` e `product_options[]` corretos (hoje só o grupo de variantes tem
   asserção de submit).
3. **Acessibilidade do ComboForm:** os toggles (`Obrigatório`, `Combo ativo`,
   etc.) são `div` com `onClick` — sem `role="switch"`/`aria-checked` nem
   foco por teclado. Migrar para botões acessíveis.
4. **Varredura de segurança/multi-tenant:** auditar `localStorage`/token e
   uso de `useStore()` vs. slugs hardcoded conforme regras do CLAUDE.md.
