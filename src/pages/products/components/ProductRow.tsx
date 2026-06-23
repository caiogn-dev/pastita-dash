import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical } from 'lucide-react';
import type { Product } from '../../../services/products';
import { InlineStockStepper } from './InlineStockStepper';
import { InlinePriceField } from './InlinePriceField';
import { StatusToggle, FeaturedToggle } from './InlineToggle';

export type RowMenuAction = 'edit' | 'duplicate' | 'delete';
interface Props {
  product: Product;
  onOpen: (p: Product) => void;
  onStock: (id: string, qty: number) => void;
  onPrice: (id: string, price: number) => void;
  onStatus: (id: string, active: boolean) => void;
  onFeatured: (id: string, featured: boolean) => void;
  onMenuAction: (id: string, action: RowMenuAction) => void;
}

const ProductRowBase: React.FC<Props> = ({ product, onOpen, onStock, onPrice, onStatus, onFeatured, onMenuAction }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: product.id,
    data: { type: 'product', category: product.category ?? null },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const img = (product as any).main_image_url || product.image_url || product.image;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 border-b px-3 py-2">
      <button {...attributes} {...listeners} aria-label="arrastar" className="cursor-grab text-fg-muted-token"><GripVertical size={16} /></button>
      {img ? <img src={img} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-surface-muted-token" />}
      <button className="flex-1 text-left" onClick={() => onOpen(product)}>{product.name}</button>
      {product.track_stock && <InlineStockStepper value={product.stock_quantity} onChange={(q) => onStock(product.id, q)} />}
      <InlinePriceField value={product.price} onCommit={(v) => onPrice(product.id, v)} />
      <StatusToggle active={product.status === 'active'} onChange={(a) => onStatus(product.id, a)} />
      <FeaturedToggle featured={!!product.featured} onChange={(f) => onFeatured(product.id, f)} />
      <button aria-label="menu" onClick={() => onMenuAction(product.id, 'edit')}><MoreVertical size={16} /></button>
    </div>
  );
};

// Memoizado: com rowHandlers estável (useMemo no ProductsPage), um re-render que
// não toca a lista de produtos (busca, filtro, colapso, reorderMode) deixa de
// re-renderizar todas as linhas.
export const ProductRow = memo(ProductRowBase);
