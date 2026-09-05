import React from 'react';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import type { StoreCategory } from '../../../services/storesApi';

/** Só FILTRO: o que muda a lista que você vê, não o que existe. */
interface Props {
  search: string;
  onSearch: (v: string) => void;
  categoryFilter: string;
  categories: StoreCategory[];
  onCategoryFilter: (v: string) => void;
}
export const ProductsToolbar: React.FC<Props> = ({
  search,
  onSearch,
  categoryFilter,
  categories,
  onCategoryFilter,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative flex-1 min-w-[200px]">
      <Search
        size={16}
        className="absolute left-2 top-2.5 text-fg-muted-token"
      />
      <input
        className="w-full rounded border py-2 pl-8 pr-3"
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
    <select
      className="rounded border px-3 py-2"
      value={categoryFilter}
      onChange={(e) => onCategoryFilter(e.target.value)}
    >
      <option value="">Todas as categorias</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  </div>
);

/**
 * As AÇÕES do cardápio, separadas do filtro.
 *
 * Estavam na mesma barra: buscar, filtrar, ordenar e adicionar categoria lado
 * a lado, quatro controles de dois tipos diferentes com o mesmo peso visual.
 * Filtro muda o que você VÊ; ação muda o que EXISTE — e misturar os dois faz
 * o dono clicar em "adicionar categoria" procurando um filtro.
 *
 * O chassi da página tem lugar para cada um (`filtros` e `acoes`), e é ele que
 * dá a mesma posição em todas as telas.
 */
export const AcoesDoCardapio: React.FC<{
  reorderMode: boolean;
  onReorderCategories: () => void;
  onAddCategory: () => void;
}> = ({ reorderMode, onReorderCategories, onAddCategory }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      className={`flex items-center gap-1 rounded px-3 py-2 ${reorderMode ? 'bg-emerald-600 text-white' : 'bg-primary-token text-white'}`}
      onClick={onReorderCategories}
    >
      <ArrowUpDown size={16} /> {reorderMode ? 'Concluir ordenação' : 'Ordenar categorias'}
    </button>
    <button
      className="flex items-center gap-1 rounded bg-primary-token px-3 py-2 text-white"
      onClick={onAddCategory}
    >
      <Plus size={16} /> Adicionar categoria
    </button>
  </div>
);
