import { useState, type FC } from 'react';
import deliveryService from '../../../../services/delivery';
import { updateStore } from '../../../../services/storesApi';

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
      <label className="block text-sm"><span className="text-fg-token">Taxa de entrega (R$)</span>
        <input aria-label="Taxa de entrega" type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
      </label>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={saveZone} disabled={busy || !fee}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
        Salvar e continuar
      </button>
      <button onClick={pickupOnly} disabled={busy}
        className="w-full text-sm text-fg-muted-token hover:text-fg-token">
        Minha loja é só retirada
      </button>
    </div>
  );
};
export default StepDelivery;
