import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
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
  reorderMode?: boolean;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  onAddItem: (categoryId: string | null) => void;
}
export const CategorySection: React.FC<Props> = ({ group, collapsed, rowHandlers, reorderMode, onToggleCollapse, onTogglePause, onAddItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: group.id ?? '__uncategorized__',
    data: { type: 'category', category: group.id },
  });
  const sortable = reorderMode && !!group.id;
  const style = sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined;
  const dragHandle = sortable ? (
    <button {...attributes} {...listeners} aria-label="arrastar categoria" className="cursor-grab text-fg-muted-token">
      <GripVertical size={16} />
    </button>
  ) : undefined;
  return (
  <section ref={sortable ? setNodeRef : undefined} style={style} className="mb-4 rounded-lg border bg-surface-token">
    <CategoryHeader group={group} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onTogglePause={onTogglePause} dragHandle={dragHandle} />
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
};
