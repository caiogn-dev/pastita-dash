import React from 'react';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import { PeriodChips } from '../../../components/ui';
import type { EstadoDoProduto } from '../numerosDoCardapio';

/**
 * Só FILTRO: o que muda a lista que você vê, não o que existe.
 *
 * O seletor "Todas as categorias" saiu (06/10): ele FILTRAVA, e o que o dono
 * queria era NAVEGAR — isso agora é o trilho de categorias, fixo no topo.
 * Ficam a busca e os filtros rápidos pelo estado do produto.
 */
interface Props {
  search: string;
  onSearch: (v: string) => void;
  estado: EstadoDoProduto;
  onEstado: (v: EstadoDoProduto) => void;
}

const ESTADOS: { value: EstadoDoProduto; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'no_ar', label: 'No ar' },
  { value: 'pausados', label: 'Pausados' },
  { value: 'sem_estoque', label: 'Sem estoque' },
];

export const ProductsToolbar: React.FC<Props> = ({ search, onSearch, estado, onEstado }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative flex-1 min-w-[200px]">
      <Search
        size={16}
        className="absolute left-2 top-2.5 text-fg-muted-token"
      />
      <input
        type="search"
        className="w-full rounded border py-2 pl-8 pr-3"
        placeholder="Buscar produto..."
        aria-label="Buscar produto"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
    <PeriodChips options={ESTADOS} value={estado} onChange={onEstado} ariaLabel="Filtrar por estado" />
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
