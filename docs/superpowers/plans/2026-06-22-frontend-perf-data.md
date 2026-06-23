# Frontend Quick Wins — Performance e Manipulação de Dados (pastita-dash) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **EXECUTAR DEPOIS** do plano de backend (`server2/docs/superpowers/plans/2026-06-22-backend-quick-wins-perf-custo.md`). As Tasks 5 e 6 dependem de endpoints novos no server2 — estão marcadas com **[DEP-BACKEND]** e não devem começar antes deles existirem.

**Goal:** Tirar o dashboard do vício de "baixar 500 linhas pra mostrar 20", adotar o react-query que já está instalado mas nunca usado, limpar o bundle de deps mortas, comprimir imagem no client e virtualizar listas grandes — pra carregar rápido sem sobrecarregar nem cliente nem servidor.

**Architecture:** React 18 + TypeScript + Vite 5, react-router 6, deploy Vercel auto na main. `@tanstack/react-query` v5 já configurado (`src/App.tsx:287`, staleTime 5min, gcTime 10min) mas com **zero** `useQuery` — todo fetch hoje é `useEffect`+axios manual em 63 arquivos. Camada de serviços em `src/services/`.

**Tech Stack:** React, TypeScript, Vite, @tanstack/react-query (já instalado), @tanstack/react-virtual (a instalar), react-hook-form (já instalado), browser-image-compression (a instalar) ou canvas nativo.

## Global Constraints

- Não quebrar contratos de API existentes. Mudanças que exigem novo endpoint vão só nas tasks **[DEP-BACKEND]**.
- Não introduzir libs novas onde já existe equivalente instalado (react-query, react-hook-form já estão no `package.json`).
- Build de produção deve passar (`tsc && vite build`) — erro de TS bloqueia o deploy Vercel.
- TDD onde houver lógica testável (compressão, query hooks). Para mudanças puramente visuais/bundle, validar com build + medição.
- Medir ANTES e DEPOIS: `rollup-plugin-visualizer` pro bundle; React DevTools Profiler / Lighthouse pro render.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `vite.config.ts` | bundler, manualChunks, visualizer | Modify |
| `package.json` | remover deps mortas, add virtual/compression | Modify |
| `src/utils/compressImage.ts` | compressão client-side | Create |
| `src/pages/products/ProductFormModal.tsx:168-177` | usar compressão no upload | Modify |
| `src/hooks/queries/*.ts` | hooks react-query por recurso | Create |
| `src/pages/products/ProductsPage.tsx` | useQuery + virtualização | Modify |
| `src/pages/orders/OrdersPage.tsx` | memo de cards, tick isolado | Modify |
| `src/pages/customers/CustomersPage.tsx` | **[DEP-BACKEND]** server-side data | Modify |
| `src/pages/payments/PaymentsPage.tsx` | **[DEP-BACKEND]** paginação server | Modify |

---

### Task 1: Medir o bundle (baseline) + remover deps mortas

`reactflow`, `chart.js` e `react-chartjs-2` têm **0 imports** no código mas estão no `manualChunks` (`vite.config.ts:32`) forçando-as no bundle. Charts reais usam só `recharts`. Primeiro medir, depois cortar, depois medir de novo.

**Files:**
- Modify: `vite.config.ts:25-46`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada.
- Produces: bundle menor; `dist/stats.html` para inspeção.

- [ ] **Step 1: Instalar visualizer e gerar baseline**

```bash
npm i -D rollup-plugin-visualizer
```
Em `vite.config.ts`, adicionar ao array `plugins`:
```ts
import { visualizer } from 'rollup-plugin-visualizer'
// ...
visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
```

- [ ] **Step 2: Build baseline e anotar tamanhos**

Run: `npm run build`
Abrir `dist/stats.html`. Anotar o tamanho gzip de `vendor-charts` e do total. (Baseline pra comparar.)

- [ ] **Step 3: Confirmar que as deps estão mortas**

Run: `grep -rIl "reactflow\|react-chartjs-2\|from 'chart.js'\|from \"chart.js\"" src/`
Expected: nenhum resultado (0 imports). Se houver, NÃO remover aquela dep.

- [ ] **Step 4: Remover do manualChunks e do package.json**

Em `vite.config.ts`, tirar `reactflow`, `chart.js`, `react-chartjs-2` da entrada `vendor-charts` do `manualChunks` (manter só `recharts`).
```bash
npm uninstall reactflow chart.js react-chartjs-2
```

- [ ] **Step 5: Rebuild e comparar**

Run: `npm run build`
Expected: `vendor-charts` cai aprox. à metade; build verde. Anotar a diferença no `dist/stats.html`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "perf: remover deps mortas (reactflow/chart.js/react-chartjs-2) do bundle + add visualizer"
```

---

### Task 2: Compressão de imagem client-side no upload de produto

`ProductFormModal.handleImageChange` (`src/pages/products/ProductFormModal.tsx:168-177`) manda o `File` cru via FormData — foto de celular de 4-8MB sobe inteira (lento no 4G do lojista + custo de storage/banda). Comprimir com canvas antes do upload.

**Files:**
- Create: `src/utils/compressImage.ts`
- Modify: `src/pages/products/ProductFormModal.tsx:168-177`
- Test: `src/utils/compressImage.test.ts` (Create)

**Interfaces:**
- Consumes: `File`.
- Produces: `compressImage(file: File, opts?: { maxSize?: number; quality?: number }): Promise<File>` — redimensiona para no máx `maxSize` px (default 1600) e re-encoda em WebP (default quality 0.8).

- [ ] **Step 1: Teste (falha)**

```ts
// src/utils/compressImage.test.ts
import { describe, it, expect } from 'vitest'
import { compressImage } from './compressImage'

describe('compressImage', () => {
  it('retorna um File menor ou igual e do tipo webp para uma imagem grande', async () => {
    // criar um canvas grande -> blob -> File como entrada
    const canvas = document.createElement('canvas')
    canvas.width = 4000; canvas.height = 3000
    const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), 'image/png'))
    const input = new File([blob], 'foto.png', { type: 'image/png' })
    const out = await compressImage(input, { maxSize: 1600, quality: 0.8 })
    expect(out.type).toBe('image/webp')
    expect(out.size).toBeLessThanOrEqual(input.size)
  })
})
```

> Se o projeto não tiver `vitest`/jsdom configurado, usar o runner de teste já presente (checar `package.json` scripts). O ambiente precisa de canvas (jsdom + `canvas` ou happy-dom). Se inviável testar no DOM, extrair a lógica de cálculo de dimensões (`fitWithin(w, h, max)`) e testar essa função pura.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- compressImage`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/utils/compressImage.ts
export function fitWithin(w: number, h: number, max: number): [number, number] {
  if (w <= max && h <= max) return [w, h]
  const ratio = w > h ? max / w : max / h
  return [Math.round(w * ratio), Math.round(h * ratio)]
}

export async function compressImage(
  file: File,
  { maxSize = 1600, quality = 0.8 }: { maxSize?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const [w, h] = fitWithin(bitmap.width, bitmap.height, maxSize)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), 'image/webp', quality))
  if (!blob || blob.size >= file.size) return file  // nunca piorar
  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- compressImage`
Expected: PASS.

- [ ] **Step 5: Usar no modal**

Em `ProductFormModal.tsx:168-177`, antes de setar o arquivo no FormData/state:
```ts
const handleImageChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const compressed = await compressImage(file)
  // usar `compressed` no lugar de `file` daqui pra frente
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/utils/compressImage.ts src/utils/compressImage.test.ts src/pages/products/ProductFormModal.tsx
git commit -m "perf: comprimir imagem no client (webp 0.8, max 1600px) antes do upload de produto"
```

---

### Task 3: Adotar react-query nos fetches quentes (produtos primeiro)

O `QueryClient` já existe e é desperdiçado. Migrar o fetch de produtos para `useQuery` dá cache por loja, dedup e fim do spinner a cada navegação — sem reescrever a camada `src/services/`.

**Files:**
- Create: `src/hooks/queries/useProducts.ts`
- Modify: `src/pages/products/ProductsPage.tsx:42-62` (trocar useEffect+axios por useQuery)
- Test: `src/hooks/queries/useProducts.test.tsx` (Create)

**Interfaces:**
- Consumes: o service existente que busca produtos (confirmar nome real em `src/services/`, ex. `getProducts({ store, page_size })`).
- Produces: `useProducts(storeId: string)` → `{ data, isLoading, error }`, com queryKey `['products', storeId]`.

- [ ] **Step 1: Teste do hook (falha)**

```tsx
// src/hooks/queries/useProducts.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProducts } from './useProducts'
import * as svc from '../../services/products' // ajustar import real

it('busca produtos uma vez e cacheia por storeId', async () => {
  const spy = vi.spyOn(svc, 'getProducts').mockResolvedValue({ results: [{ id: 1 }] } as any)
  const client = new QueryClient()
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useProducts('store-1'), { wrapper })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  renderHook(() => useProducts('store-1'), { wrapper }) // 2ª montagem
  expect(spy).toHaveBeenCalledTimes(1) // dedup/cache
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- useProducts`
Expected: FAIL — hook inexistente.

- [ ] **Step 3: Implementar o hook**

```ts
// src/hooks/queries/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../../services/products' // ajustar ao service real

export function useProducts(storeId: string) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProducts({ store: storeId, page_size: 500 }),
    enabled: !!storeId,
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- useProducts`
Expected: PASS.

- [ ] **Step 5: Usar na página**

Em `ProductsPage.tsx`, remover o `useEffect`+`load()`+`useState(loading)` e usar `const { data, isLoading } = useProducts(storeId)`. Manter o resto da UI igual. Validar no navegador que trocar de aba e voltar **não** mostra spinner (cache hit).

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/hooks/queries/useProducts.ts src/hooks/queries/useProducts.test.tsx src/pages/products/ProductsPage.tsx
git commit -m "perf: ProductsPage via react-query (cache por loja, dedup, sem spinner ao renavegar)"
```

> Repetir o padrão depois para pedidos e clientes (`useOrders`, `useCustomers`) — cada um vira um commit próprio seguindo este mesmo molde.

---

### Task 4: Estabilizar handlers + memoizar cards (matar re-render do tick de 60s)

`OrdersPage` tem `setInterval(setTick, 60000)` (`:158`) que re-renderiza o board inteiro a cada minuto porque os cards não são `React.memo` e recebem handlers recriados a cada render. `ProductsPage` recria `rowHandlers` (objeto literal, `:104`) quebrando memo a jusante.

**Files:**
- Modify: `src/pages/orders/OrdersPage.tsx:104,158,504-509` e o componente de card de pedido
- Modify: `src/pages/products/ProductsPage.tsx:104`

**Interfaces:**
- Consumes: nada novo.
- Produces: cards memoizados; handlers estáveis via `useCallback`.

- [ ] **Step 1: Medir baseline (Profiler)**

Abrir React DevTools Profiler, gravar 1 minuto na OrdersPage, confirmar o re-render geral no tick. Anotar nº de componentes que re-renderizam.

- [ ] **Step 2: Estabilizar handlers**

Envolver os handlers passados aos cards/rows em `useCallback` com deps corretas. Trocar o objeto literal `rowHandlers` (ProductsPage:104) por um memo:
```ts
const rowHandlers = useMemo(() => ({ onEdit, onToggle, onDelete }), [onEdit, onToggle, onDelete])
```
(onde `onEdit/onToggle/onDelete` já são `useCallback`).

- [ ] **Step 3: Memoizar o card**

Extrair/embrulhar o card de pedido e o `ProductRow` em `React.memo`. Garantir que as props sejam primitivas ou referências estáveis.

- [ ] **Step 4: Medir de novo**

Profiler: no tick de 60s, só o que mudou deve re-renderizar (não o board inteiro). Confirmar a queda.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/pages/orders/OrdersPage.tsx src/pages/products/ProductsPage.tsx
git commit -m "perf: memoizar cards de pedido/produto + handlers estaveis (mata re-render do tick de 60s)"
```

---

### Task 5: **[DEP-BACKEND]** Tirar o over-fetch de clientes (filtro/KPI/pedidos no servidor)

`CustomersPage` baixa 200 pedidos pra filtrar 1 cliente (`:85-88`), 500 clientes pra calcular KPIs no JS (`:369,383-403`) e pagina fatiando array em memória. Isso depende de endpoints no server2 que **não existem ainda** — criar lá primeiro.

> **BLOQUEADO** até o server2 expor: (a) `?customer=<id>` em pedidos; (b) endpoint de KPIs agregados de clientes (`annotate`/`aggregate`); (c) paginação + `?search=`/`?is_active=` server-side em clientes. Abrir um plano/issue no server2 antes desta task. **Não** implementar workaround client-side novo.

**Files:**
- Modify: `src/pages/customers/CustomersPage.tsx:85-88,369,383-403`
- Create: `src/hooks/queries/useCustomers.ts`, `src/hooks/queries/useCustomerKpis.ts`

- [ ] **Step 1:** Confirmar que os 3 endpoints existem no server2 (testar via curl/devtools). Se não, **parar** e criar no backend primeiro.
- [ ] **Step 2:** `useCustomers` com `useInfiniteQuery` paginando server-side (sem `page_size:500`).
- [ ] **Step 3:** KPIs vindos do endpoint agregado, não calculados no JS — remover os 4 passes sobre o array (`:383-403`).
- [ ] **Step 4:** Pedidos-por-cliente via `?customer=` (200→~5 registros).
- [ ] **Step 5:** Build + commit `perf: clientes server-side (paginacao + KPIs agregados + pedidos por ?customer=)`.

---

### Task 6: **[DEP-BACKEND]** Paginação server-side em pagamentos + virtualização do que sobrar

`PaymentsPage` usa `page_size:500` (`:102`). Para listas que legitimamente ficam grandes (produtos, pedidos), virtualizar o DOM.

> Paginação de pagamentos depende de suporte server-side. Virtualização é independente e pode ser feita antes.

**Files:**
- Modify: `src/pages/payments/PaymentsPage.tsx:102` **[DEP-BACKEND]**
- Modify: `src/pages/products/ProductsPage.tsx` (virtualização — independente)

- [ ] **Step 1:** `npm i @tanstack/react-virtual`.
- [ ] **Step 2:** Virtualizar a lista de produtos com `useVirtualizer` (renderiza só o visível). Medir INP antes/depois no Profiler.
- [ ] **Step 3:** **[DEP-BACKEND]** Trocar `page_size:500` de pagamentos por paginação server-side via `useInfiniteQuery`.
- [ ] **Step 4:** Build + commits separados (virtualização / pagamentos server-side).

---

### Task 7: Higiene de imagens (lazy + decoding)

Só 2 de 37 `<img>` têm `loading="lazy"`, 0 têm `srcSet`. Grids carregam tudo de uma vez.

**Files:**
- Modify: todos os `<img>` de grid (produtos, clientes) fora do above-the-fold.

- [ ] **Step 1:** `grep -rn "<img" src/ | wc -l` para inventário.
- [ ] **Step 2:** Adicionar `loading="lazy" decoding="async"` nas imagens de grid/lista (não nas do above-the-fold/logo).
- [ ] **Step 3:** Build + commit `perf: loading=lazy + decoding=async nas imagens de grid`.

---

## Sequência e dependências

- **Independentes, faça já (não esperam backend):** Task 1 (deps mortas), Task 2 (compressão), Task 3 (react-query produtos), Task 4 (memo/tick), Task 6-Step 2 (virtualização produtos), Task 7 (lazy img).
- **[DEP-BACKEND] — só depois dos endpoints no server2:** Task 5 (clientes), Task 6 paginação de pagamentos.
- Ordem recomendada: 1 → 2 → 3 → 4 → 7 → (virtualização) → [quando backend pronto] 5 → 6.

## Como medir (antes/depois)

- **Bundle:** `rollup-plugin-visualizer` → `dist/stats.html` (Task 1 deixa instalado).
- **Render:** React DevTools Profiler (gravar interação, ver "Ranked" e "Why did this render").
- **Web Vitals reais:** ligar Vercel Web Analytics no projeto → LCP/INP/CLS por rota em produção.
- **Network:** DevTools → confirmar que renavegar não refaz requests (cache react-query) e que uploads de imagem caíram de MB para centenas de KB.

## Self-Review

- Cobertura dos achados do frontend: deps mortas (T1), compressão (T2), react-query nunca usado (T3), re-render/tick (T4), over-fetch clientes (T5), page_size:500 pagamentos + virtualização (T6), imagens lazy (T7). ✅
- Dependências de backend isoladas e marcadas **[DEP-BACKEND]**, não bloqueiam as tasks baratas. ✅
- Não introduz libs onde já há equivalente (react-query/react-hook-form já instalados). ✅
- Tipos consistentes: `compressImage`/`fitWithin` (T2), `useProducts` queryKey `['products', storeId]` (T3) reaproveitado em T5/T6. ✅
