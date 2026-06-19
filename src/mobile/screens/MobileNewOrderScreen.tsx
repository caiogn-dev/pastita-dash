// src/mobile/screens/MobileNewOrderScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { ordersService, productsService } from '../../services';

interface ProductLite { id: string; name: string; price: number | string; }
interface LineItem { product_id: string; name: string; quantity: number; }

export const MobileNewOrderScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    productsService.getProducts({ store: storeId, is_active: true }).then(
      (res: { results: ProductLite[] }) => setProducts(res.results),
    );
  }, [storeId]);

  const addItem = (p: ProductLite) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, name: p.name, quantity: 1 }];
    });
  };

  const submit = async () => {
    if (!storeId || !name || items.length === 0) return;
    setSubmitting(true);
    try {
      const order = await ordersService.createOrder({
        store: storeId,
        customer_name: name,
        customer_phone: phone,
        delivery_method: 'pickup',
        delivery_fee: 0,
        payment_method: 'cash',
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setDone((order as { order_number: string }).order_number);
      setName('');
      setPhone('');
      setItems([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (!storeId) return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;

  return (
    <div className="p-3 space-y-4">
      {done && (
        <div className="rounded-lg bg-brand-soft p-3 text-sm text-fg-primary">
          Pedido {done} criado!
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-fg-secondary" htmlFor="m-nome">Nome do cliente</label>
        <input
          id="m-nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary"
        />
        <label className="block text-sm text-fg-secondary" htmlFor="m-tel">Telefone</label>
        <input
          id="m-tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary"
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Produtos</h2>
        <ul className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => addItem(p)}
                className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-left text-sm text-fg-primary"
              >
                {p.name}
                <span className="block text-xs text-fg-muted">R$ {Number(p.price).toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">No pedido</h2>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.product_id} className="flex justify-between text-sm text-fg-primary">
                <span>{i.name}</span>
                <span>x{i.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={submitting || !name || items.length === 0}
        onClick={submit}
        className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {submitting ? 'Enviando...' : 'Finalizar pedido'}
      </button>
    </div>
  );
};
