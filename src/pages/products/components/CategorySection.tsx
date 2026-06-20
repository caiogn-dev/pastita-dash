import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { CategoryHeader } from './CategoryHeader';
import { ProductRow, RowMenuAction } from './ProductRow';
import type { CategoryGroup } from '../hooks/useProductsGrouped';
import type { Product } from '../../../services/products';

export interface RowHandlers {
  onOpen: (p: Product) => void;
  onStock: (id: string, qty: number) => void;
  onPrice: (id: string, price: number) => void;
  onStatus: (id: string, active: boolean) => void;
  onFeatured: (id: string, featured: boolean) => void;
  onMenuAction: (id: string, action: RowMenuAction) => void;
}
interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  rowHandlers: RowHandlers;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  onAddItem: (categoryId: string | null) => void;
}
export const CategorySection: React.FC<Props> = ({ group, collapsed, rowHandlers, onToggleCollapse, onTogglePause, onAddItem }) => (
  <section className="mb-4 rounded-lg border bg-surface-token">
    <CategoryHeader group={group} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onTogglePause={onTogglePause} />
    {!collapsed && (
      <>
        <SortableContext items={group.products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {group.products.map((p) => (
            <ProductRow key={p.id} product={p}
              onOpen={rowHandlers.onOpen} onStock={rowHandlers.onStock} onPrice={rowHandlers.onPrice}
              onStatus={rowHandlers.onStatus} onFeatured={rowHandlers.onFeatured} onMenuAction={rowHandlers.onMenuAction} />
          ))}
        </SortableContext>
        <button className="flex items-center gap-1 px-3 py-2 text-sm text-primary-token" onClick={() => onAddItem(group.id)}>
          <Plus size={14} /> Adicionar novo item
        </button>
      </>
    )}
  </section>
);
