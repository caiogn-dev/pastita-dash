import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { productsService } from '../../../../services/products';
import type { Product } from '../../../../services/products';
import type { CartItem } from '../types';
import { fmt } from '../types';
import { precoVigenteDoProduto } from '../../../../utils/precoVigente';

/** Step 3 */
export function StepItens({
  storeId,
  cart,
  onAdd,
  onQtyChange,
  onRemove,
}: {
  storeId: string;
  cart: CartItem[];
  onAdd: (product: Product) => void;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!storeId) {
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    productsService
      .getProducts({ store: storeId, is_active: true, page_size: 40, ordering: 'name' })
      .then((data) => setProducts(data.results || []))
      .catch(() => { setProducts([]); toast.error('Erro ao carregar produtos'); })
      .finally(() => setLoadingProducts(false));
  }, [storeId]);

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSearch = (q: string) => {
    clearTimeout(debounceRef.current);
    setSearch(q);
  };

  const cartProductIds = new Set(cart.map((c) => c.product.id));
  const subtotal = cart.reduce((s, c) => s + precoVigenteDoProduto(c.product) * c.quantity, 0);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-token bg-surface">
        <MagnifyingGlassIcon className="h-4 w-4 text-fg-muted-token flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="flex-1 bg-transparent text-sm text-fg-token placeholder:text-fg-muted-token outline-none"
        />
      </div>

      {/* Product list */}
      {loadingProducts ? (
        <p className="text-sm text-fg-muted-token text-center py-4">Carregando produtos...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-sm text-fg-muted-token text-center py-4">
          {search ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {filteredProducts.map((product) => {
            const inCart = cartProductIds.has(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => !inCart && onAdd(product)}
                disabled={inCart}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors text-left ${
                  inCart
                    ? 'border-brand bg-brand-soft opacity-60 cursor-default'
                    : 'border-border-token hover:bg-surface-2 text-fg-token'
                }`}
              >
                <span className="truncate font-medium">{product.name}</span>
                <span className="flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold">
                  {inCart ? 'Adicionado' : fmt(precoVigenteDoProduto(product))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted-token">
            Carrinho
          </p>
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-token bg-surface"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg-token truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-fg-muted-token">
                  {fmt(precoVigenteDoProduto(item.product))} × {item.quantity} ={''}
                  <strong>{fmt(precoVigenteDoProduto(item.product) * item.quantity)}</strong>
                </p>
              </div>
              {/* Qty controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    item.quantity > 1
                      ? onQtyChange(item.product.id, item.quantity - 1)
                      : onRemove(item.product.id)
                  }
                  aria-label={
                    item.quantity > 1
                      ? `Diminuir quantidade de ${item.product.name}`
                      : `Remover ${item.product.name} do carrinho`
                  }
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-border-token text-fg-muted-token hover:bg-surface-2 transition-colors"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="text-sm font-bold w-5 text-center text-fg-token">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
                  aria-label={`Aumentar quantidade de ${item.product.name}`}
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-border-token text-fg-muted-token hover:bg-surface-2 transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.product.id)}
                  aria-label={`Remover ${item.product.name} do carrinho`}
                  className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 py-1">
            <span className="text-sm text-fg-muted-token">Subtotal</span>
            <span className="text-sm font-bold text-fg-token">
              {fmt(subtotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
