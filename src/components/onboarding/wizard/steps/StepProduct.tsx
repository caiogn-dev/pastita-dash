import { useState, type FC } from 'react';
import productsService from '../../../../services/products';
import { Field, TextInput, MoneyInput } from './fields';

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
      <Field label="Nome do produto">
        <TextInput value={name} onChange={setName} ariaLabel="Nome" placeholder="Ex: Salada Caesar" />
      </Field>
      <Field label="Preço">
        <MoneyInput value={price} onChange={setPrice} ariaLabel="Preço" />
      </Field>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || !name || !price}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50">
        {busy ? 'Salvando…' : 'Salvar e continuar'}
      </button>
    </div>
  );
};
export default StepProduct;
