import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SearchInput } from '../../../ui';
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

  // Todas as páginas. Com uma página só de 40, a Ivoneth (58 ativos) tinha
  // 18 produtos que nunca apareciam aqui, nem buscando pelo nome.
  useEffect(() => {
    if (!storeId) {
      setLoadingProducts(false);
      return;
    }
    let vivo = true;
    setLoadingProducts(true);
    (async () => {
      const todos: Product[] = [];
      for (let page = 1; page <= 20; page++) {
        const data = await productsService.getProducts({ store: storeId, is_active: true, page, page_size: 200, ordering: 'name' });
        todos.push(...(data.results || []));
        if (!data.next) break;
      }
      return todos;
    })()
      .then((todos) => { if (vivo) setProducts(todos); })
      .catch(() => { if (vivo) { setProducts([]); toast.error('Erro ao carregar produtos'); } })
      .finally(() => { if (vivo) setLoadingProducts(false); });
    return () => { vivo = false; };
  }, [storeId]);

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  const qtdNoCarrinho = new Map(cart.map((c) => [c.product.id, c.quantity]));
  const subtotal = cart.reduce((s, c) => s + precoVigenteDoProduto(c.product) * c.quantity, 0);

  return (
    <div className="space-y-3">
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar produto..."
        autoFocus
      />

      {/* Product list */}
      {loadingProducts ? (
        <p className="text-sm text-fg-muted-token text-center py-4">Carregando produtos...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-sm text-fg-muted-token text-center py-4">
          {search ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {filteredProducts.map((product) => {
            const qtd = qtdNoCarrinho.get(product.id) ?? 0;
            return (
              <button
                key={product.id}
                type="button"
                aria-label={`Adicionar ${product.name}`}
                onClick={() => (qtd > 0 ? onQtyChange(product.id, qtd + 1) : onAdd(product))}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors text-left text-fg-token ${
                  qtd > 0 ? 'border-brand bg-brand-soft' : 'border-border-token hover:bg-surface-2'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {qtd > 0 && (
                    <span className="flex-shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-brand text-on-brand text-xs font-bold flex items-center justify-center">
                      {qtd}
                    </span>
                  )}
                  <span className="truncate font-medium">{product.name}</span>
                </span>
                <span className="flex-shrink-0 font-semibold">{fmt(precoVigenteDoProduto(product))}</span>
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
              className="flex items-center gap-2 px-3 py-2 superficie"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg-token truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-fg-muted-token">
                  {fmt(precoVigenteDoProduto(item.product))} × {item.quantity} ={' '}
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
                  className="ml-1 text-danger-token hover:text-danger-token transition-colors"
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
