# Evolução do Cardapidex Dashboard

Registro do loop diário de evolução do painel (`pastita-dash`). Cada execução
entrega **uma fatia de valor** com disciplina de zero-regressão: testes verdes
antes e depois, `npx tsc --noEmit` limpo (senão a Vercel não builda) e entrega
via PR (nunca push direto na `main`).

## Baseline medido (2026-07-02)

- `npm ci`: OK (5 vulnerabilidades de auditoria — 1 baixa, 2 moderadas, 2 altas; não bloqueiam build).
- `npx tsc --noEmit`: **limpo**.
- `npm test`: **244/258** — 1 suíte vermelha (`ComboForm.test.tsx`, 14 falhas).

## Histórico

### 2026-07-02 — Restaurar suíte verde do ComboForm (testes desatualizados)

- **Medição antes:** `npm test` = 244 passando / 14 falhando (1 suíte vermelha);
  `tsc` limpo.
- **Diagnóstico:** o `ComboForm` foi redesenhado nos commits `77b1d19`
  (editor de grupo-de-produtos) e `b5ff593` (preço dinâmico). O botão único
  "Adicionar Item" deu lugar a dois botões — **"Grupo de variantes"** e
  **"Grupo de produtos"** — mas a Section 2 dos testes ainda buscava o texto
  antigo, quebrando 14 casos. Bug de teste, não de produto.
- **Mudança:** `src/components/Combos/__tests__/ComboForm.test.tsx` alinhado ao
  componente atual — seletor do botão de adicionar grupo, asserção de presença
  dos dois botões na aba Itens e correção do match ambíguo de
  "Selecionar produto" (header vs. `<option>`) para string exata.
  Nenhuma alteração em código de produção.
- **Medição depois:** `npm test` = **258/258** (58 suítes verdes); `tsc` limpo.
- **Próximo passo priorizado:** ver backlog abaixo (item aberto de maior valor:
  auditoria de segurança/tenant nos serviços com stubs).

## Backlog priorizado (aberto)

1. **Auditoria de vazamento entre tenants** nos serviços (`crmApi`,
   `marketingService`, `automation`) — garantir `storeSlug` obrigatório em
   todos os endpoints e ausência de fallback hardcoded de slug.
2. **Vulnerabilidades de dependência** (`npm audit`: 2 altas) — avaliar
   `npm audit fix` sem breaking changes e registrar o que exige major bump.
3. **Estados de loading/erro ausentes** — varredura de páginas que fazem
   fetch sem skeleton/erro (candidatas: páginas com React Query sem
   `isError`/`isLoading` tratados).
4. **Acessibilidade** — auditar `aria-label`/foco/contraste nos toggles
   customizados (padrão `div` clicável usado no `ComboForm`/settings) que não
   são acessíveis por teclado nem expõem `role`/`aria-checked`.
5. **Stubs pendentes de backend** (`CustomerPanel`, `TemplateSelector`,
   `automation` "Flow Builder") — manter marcados como "Em breve" até o
   endpoint existir; não investir sem contrato do server2.
6. **Código morto** — `Sidebar.tsx` (legado, não renderizado) e
   `useWebSocket.ts` (stubs de compatibilidade) — candidatos a remoção após
   confirmar zero import.
