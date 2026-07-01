import { useState, type FC } from 'react';
import deliveryService from '../../../../services/delivery';
import { updateStore } from '../../../../services/storesApi';
import { Field, MoneyInput } from './fields';

const StepDelivery: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [fee, setFee] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function saveZone() {
    setBusy(true); setErr(null);
    try {
      await deliveryService.createZone({ store: storeId, name: 'Padrão', delivery_fee: Number(fee || 0), is_active: true });
      onSaved();
    } catch { setErr('Não foi possível salvar a entrega.'); } finally { setBusy(false); }
  }
  async function pickupOnly() {
    setBusy(true); setErr(null);
    try { await updateStore(storeId, { delivery_enabled: false, pickup_enabled: true }); onSaved(); }
    catch { setErr('Não foi possível salvar.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">Defina a taxa de entrega ou marque só retirada.</p>
      <Field label="Taxa de entrega">
        <MoneyInput value={fee} onChange={setFee} ariaLabel="Taxa de entrega" />
      </Field>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={saveZone} disabled={busy || !fee}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50">
        {busy ? 'Salvando…' : 'Salvar e continuar'}
      </button>
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border-token" />
        <span className="text-xs text-fg-muted-token">ou</span>
        <span className="h-px flex-1 bg-border-token" />
      </div>
      <button onClick={pickupOnly} disabled={busy}
        className="w-full rounded-lg border border-border-token px-4 py-2.5 text-sm font-medium text-fg-token transition-colors hover:bg-surface-muted-token disabled:opacity-50">
        Minha loja é só retirada
      </button>
    </div>
  );
};
export default StepDelivery;
