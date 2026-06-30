import { useState, type FC } from 'react';
import productsService from '../../../../services/products';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'produto';
}

const StepProduct: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    try {
      await productsService.createProduct({
        name, price: Number(price), sku: `${slugify(name)}-${Date.now().toString(36)}`,
        stock_quantity: 0, is_active: true, store: storeId,
      });
      onSaved();
    } catch { setErr('Não foi possível salvar o produto.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">Cadastre um item pra sua loja começar a vender.</p>
      <label className="block text-sm"><span className="text-fg-token">Nome</span>
        <input aria-label="Nome" value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
      </label>
      <label className="block text-sm"><span className="text-fg-token">Preço (R$)</span>
        <input aria-label="Preço" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
      </label>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || !name || !price}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
        Salvar e continuar
      </button>
    </div>
  );
};
export default StepProduct;
