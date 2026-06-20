# Página de Produtos por Categoria — Design

**Data:** 2026-06-20
**Repo:** pastita-dash
**Arquivo-alvo atual:** `src/pages/products/ProductsPageNew.tsx` (1474 linhas, god file)

## Problema

Com muitos produtos, a página atual (grid/list de cards grandes) ocupa tela demais e exige rolagem infinita. Falta agrupar por categoria, controlar a ordem das categorias, e editar estoque/preço/status sem abrir modal. Referências visuais: `ftp-data/produto-page (1).png`, `produto-page2.png`, `product-modal.png` (estilo "cardápio" de gestor de delivery).

## Objetivo

Substituir as views grid/list por uma **lista densa agrupada por categoria** (accordion), com edição **inline** dos campos operacionais e **reordenação por arraste** que reflete no storefront. Visualização de imagem grande passa a viver no **modal** do produto.

## Escopo (v1)

- Lista densa agrupada por categoria; remove grid e list.
- Edição inline (optimistic + rollback): **estoque (`− N +`), preço, status (Ativo/Pausado), destaque (⭐)**.
- Drag (@dnd-kit): **reordenar categorias**, **reordenar produtos dentro da categoria**, **mover produto entre categorias**. Persiste `sort_order`/`category` → reflete no storefront (mesmo `sort_order` que o cliente vê).
- Categoria: header com nome, contagem, toggle pausar categoria, menu (editar/excluir), colapsar. "+ Adicionar novo item" abre modal já com a categoria.
- Modal do produto: mantém abas atuais; **incrementa** imagem principal grande + galeria + **setas ‹ › prev/next** entre produtos.
- Toolbar: seletor de unidade · filtro de categoria · busca · botões "Ordenar categorias" e "+ Adicionar categoria".
- Refatorar o god file em componentes.

## Fora de escopo

- Endpoint de reorder em lote no backend (v1 usa PATCH por item alterado; otimizar depois se necessário).
- Mudanças de modelo no backend (já há `sort_order`/`is_active` em categoria e produto).

## Backend (já existe — sem mudança)

- Serviço canônico da página: **`storesApi.updateProduct(id, partial)`** (NÃO o `products.ts`). Campos reais no `Product`/patch:
  - Status: **`status: 'active' | 'inactive'`** (não `is_active`). A página já faz `updateProduct(id, { status })`.
  - Destaque: **`featured: boolean`** (não `is_featured`). Já faz `updateProduct(id, { featured })`.
  - Estoque/preço/ordem/categoria: `stock_quantity`, `price`, `sort_order`, `category`, `track_stock`.
- `StoreCategory`: tem `sort_order`, `is_active`, `products_count` (`src/services/storesApi.ts`).
- `updateCategory(id, Partial<StoreCategoryInput>)` e `createCategory(...)` existem (`storesApi.ts`).
- `getProducts(filters)` retorna lista paginada **flat** → agrupamento por categoria é client-side.
- Padrão de drag a seguir: `src/components/orders/OrdersKanban.tsx` (DndContext/SortableContext/useSortable, @dnd-kit já instalado).

## Arquitetura (quebra do god file)

```
src/pages/products/
  ProductsPage.tsx            container: fetch, filtros, DndContext, estado de modais
  ProductFormModal.tsx        extraído do arquivo atual (modal de edição com abas)
  hooks/
    useProductsGrouped.ts     agrupa produtos por categoria + ordena (cat.sort_order, prod.sort_order)
    useInlineProductMutations.ts  PATCH optimistic (estoque/preço/status/destaque) + rollback
    useReorder.ts             reindex local + persistência de sort_order/category no drop
  components/
    ProductsToolbar.tsx       unidade · filtro · busca · "Ordenar categorias" · "+ Adicionar categoria"
    CategorySection.tsx       wrapper sortable de 1 categoria (header + linhas + "adicionar item")
    CategoryHeader.tsx        alça · nome · contagem · toggle pausar · ⋮ · colapsar
    ProductRow.tsx            linha sortable: alça · thumb · nome ⭐🏷️ · estoque · preço · status · ⋮
    InlineStockStepper.tsx    − N + (só se track_stock); debounce ~600ms
    InlinePriceField.tsx      preço editável; salva no blur/Enter
    InlineToggle.tsx          Ativo/Pausado e Destaque (imediato)
```

Cada unidade tem propósito único e interface clara (props tipadas); `ProductRow` não conhece fetch, só dispara callbacks do container.

## Layout

- **Toolbar** fixa no topo.
- **Seções por categoria** (accordion), ordenadas por `category.sort_order`. Produtos sem categoria → seção **"Sem categoria"** no fim.
- **Linha de produto** (densa, 1 linha):
  `☰ · thumb · nome ⭐🏷️ · [− N +] · [R$ ___] · (Pausado|Ativo) · ⋮`
- Clicar na linha (fora dos controles inline) abre o modal de edição.

## Edição inline (optimistic + rollback)

| Campo | Gatilho | Persistência |
|-------|---------|--------------|
| Estoque | `− N +` (só `track_stock`) | `updateProduct({ stock_quantity })`, debounce ~600ms |
| Preço | editar caixa | `updateProduct({ price })` no blur/Enter |
| Status | toggle | `updateProduct({ status: 'active'\|'inactive' })` imediato |
| Destaque | ⭐ | `updateProduct({ featured })` imediato |
| Categoria (pausar) | toggle no header | `updateCategory({ is_active })` imediato |

Regra: aplica no estado local na hora; em falha de PATCH, **reverte** e mostra toast de erro. Estoque com debounce pra não floodar PATCH.

## Reordenação (drag)

- **Categorias**: no modo "Ordenar categorias", arrastar seções → reindexar `sort_order` local → PATCH `updateCategory({ sort_order })` das categorias que mudaram.
- **Produtos dentro da categoria**: arrastar linha → reindexar `sort_order` local → PATCH `updateProduct({ sort_order })` dos afetados.
- **Mover entre categorias**: soltar linha em outra seção → `updateProduct({ category, sort_order })` do item movido + reindex das duas seções.
- Tudo optimistic com rollback no erro. Persistência em paralelo só dos itens que mudaram de índice.

## Modal do produto

- Reaproveita o `ProductFormModal` atual (abas, incl. Estoque).
- Incrementos: imagem principal grande + galeria de imagens; **setas ‹ ›** navegam pro produto anterior/próximo na lista achatada/ordenada **sem fechar** o modal (mantém aba ativa quando possível).

## Tratamento de erro

- Toda mutation inline e de reorder é optimistic com rollback + toast.
- Debounce no estoque; PATCH de reorder dispara só pros itens com índice alterado.
- Falha de fetch inicial: estado de erro com retry (padrão atual da página).

## Testes

- `useProductsGrouped`: agrupa/ordena correto, "Sem categoria" no fim, respeita `sort_order`.
- `InlineStockStepper`: incrementa/decrementa, não desce abaixo de 0, optimistic + rollback em falha.
- `InlinePriceField`: salva no blur/Enter, formata R$, rollback em falha.
- `useReorder`: reindex correto em reordenar e mover entre categorias; PATCH só dos alterados.
- Componente `ProductRow`/`CategorySection`: render dos controles conforme flags (track_stock, is_featured, is_active).

## Riscos

- Reescrita grande de um arquivo central → fazer com paridade de comportamento do modal e cobertura de teste antes de remover o código antigo.
- PATCH por item no reorder de listas grandes pode gerar várias requisições; aceitável na v1 (só itens alterados), endpoint em lote fica anotado pra depois.
