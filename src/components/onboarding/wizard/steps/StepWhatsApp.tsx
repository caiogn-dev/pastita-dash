import { useState, type FC } from 'react';
import { updateStore } from '../../../../services/storesApi';

const StepWhatsApp: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [num, setNum] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    try { await updateStore(storeId, { whatsapp_number: num.replace(/\D/g, '') }); onSaved(); }
    catch { setErr('Não foi possível salvar.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">O número que recebe os pedidos da loja.</p>
      <label className="block text-sm">
        <span className="text-fg-token">WhatsApp</span>
        <input aria-label="WhatsApp" value={num} onChange={(e) => setNum(e.target.value)}
          placeholder="(63) 99999-8888"
          className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
      </label>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || !num}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
        Salvar e continuar
      </button>
    </div>
  );
};
export default StepWhatsApp;
