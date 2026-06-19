import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRootStore } from '../../stores/rootStore';
import { ordersService, productsService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
import { SkeletonList } from '../ui/Skeleton';

interface ProductLite { id: string; name: string; price: number | string; }
interface LineItem { product_id: string; name: string; price: number; quantity: number; }

const DELIVERY = [ { v: 'pickup', label: 'Retirada' }, { v: 'delivery', label: 'Entrega' } ] as const;
const PAYMENT = [ { v: 'cash', label: 'Dinheiro' }, { v: 'pix', label: 'Pix' }, { v: 'credit_card', label: 'Cartão' } ] as const;

export const MobileNewOrderScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [items, setItems] = useState<LineItem[]>([]);
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup');
  const [payment, setPayment] = useState<'cash' | 'pix' | 'credit_card'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setProductsLoading(true);
    productsService.getProducts({ store: storeId, is_active: true })
      .then((res: { results: ProductLite[] }) => setProducts(res.results || []))
      .catch(() => toast.error('Não foi possível carregar os produtos.'))
      .finally(() => setProductsLoading(false));
  }, [storeId]);

  const addItem = (p: ProductLite) => {
    const price = Number(p.price);
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, name: p.name, price, quantity: 1 }];
    });
  };
  const dec = (id: string) => setItems((prev) => prev
    .map((i) => (i.product_id === id ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.product_id !== id));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submit = async () => {
    if (!storeId || !name || items.length === 0) return;
    setSubmitting(true);
    try {
      const order = await ordersService.createOrder({
        store: storeId,
        customer_name: name,
        customer_phone: phone,
        delivery_method: delivery,
        delivery_fee: 0,
        payment_method: payment,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setDone(order.order_number);
      setName(''); setPhone(''); setItems([]);
      setTimeout(() => setDone(null), 4000);
    } catch {
      toast.error('Não foi possível criar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!storeId) return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;

  return (
    <div className="space-y-4 p-3">
      <h1 className="text-lg font-bold text-fg-primary">Novo pedido</h1>
      {done && <div className="rounded-lg bg-brand-soft p-3 text-sm text-fg-primary">Pedido {done} criado!</div>}

      <div className="space-y-2">
        <label className="block text-sm text-fg-secondary" htmlFor="m-nome">Nome do cliente</label>
        <input id="m-nome" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
        <label className="block text-sm text-fg-secondary" htmlFor="m-tel">Telefone</label>
        <input id="m-tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Produtos</h2>
        {productsLoading ? <SkeletonList count={4} />
          : products.length === 0 ? <p className="text-sm text-fg-muted">Nenhum produto ativo cadastrado.</p>
          : (
            <ul className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => addItem(p)}
                    className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-left text-sm text-fg-primary active:bg-bg-secondary">
                    {p.name}
                    <span className="block text-xs text-fg-muted">R${Number(p.price).toFixed(2)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">No pedido</h2>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.product_id} className="flex items-center justify-between text-sm text-fg-primary">
                <span className="flex-1">{i.name}</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Diminuir" onClick={() => dec(i.product_id)} className="h-8 w-8 rounded bg-bg-secondary">−</button>
                  <span>x{i.quantity}</span>
                  <button type="button" aria-label="Aumentar" onClick={() => addItem({ id: i.product_id, name: i.name, price: i.price })} className="h-8 w-8 rounded bg-bg-secondary">+</button>
                  <button type="button" aria-label="Remover" onClick={() => remove(i.product_id)} className="h-8 w-8 rounded text-fg-muted">×</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border-primary pt-2 font-semibold text-fg-primary">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-xs text-fg-secondary">Entrega</span>
          <div className="flex gap-1">
            {DELIVERY.map((d) => (
              <button key={d.v} type="button" onClick={() => setDelivery(d.v)}
                className={`flex-1 rounded-lg py-2 text-xs ${delivery === d.v ? 'bg-brand-500 text-white' : 'bg-bg-card text-fg-secondary border border-border-primary'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-fg-secondary">Pagamento</span>
          <div className="flex gap-1">
            {PAYMENT.map((p) => (
              <button key={p.v} type="button" onClick={() => setPayment(p.v)}
                className={`flex-1 rounded-lg py-2 text-xs ${payment === p.v ? 'bg-brand-500 text-white' : 'bg-bg-card text-fg-secondary border border-border-primary'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" disabled={submitting || !name || items.length === 0} onClick={submit}
        className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60">
        {submitting ? 'Enviando...' : 'Finalizar pedido'}
      </button>
    </div>
  );
};
