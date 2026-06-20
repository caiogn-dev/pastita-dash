import React from 'react';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import type { StoreCategory } from '../../../services/storesApi';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  categoryFilter: string;
  categories: StoreCategory[];
  onCategoryFilter: (v: string) => void;
  reorderMode?: boolean;
  onReorderCategories: () => void;
  onAddCategory: () => void;
}
export const ProductsToolbar: React.FC<Props> = ({
  search,
  onSearch,
  categoryFilter,
  categories,
  onCategoryFilter,
  reorderMode,
  onReorderCategories,
  onAddCategory,
}) => (
  <div className="mb-4 flex flex-wrap items-center gap-2">
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
