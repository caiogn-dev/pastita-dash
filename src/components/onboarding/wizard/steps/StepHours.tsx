import { useState, type FC } from 'react';
import { updateStore } from '../../../../services/storesApi';

const DIAS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const StepHours: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [open, setOpen] = useState('09:00');
  const [close, setClose] = useState('18:00');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    const hours = Object.fromEntries(DIAS.map((d) => [d, { open, close }]));
    try { await updateStore(storeId, { operating_hours: hours } as Record<string, unknown>); onSaved(); }
    catch { setErr('Não foi possível salvar o horário.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">Um horário padrão pra todos os dias (ajuste depois nas configurações).</p>
      <div className="flex gap-3">
        <label className="flex-1 text-sm"><span className="text-fg-token">Abre</span>
          <input aria-label="Abre" type="time" value={open} onChange={(e) => setOpen(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
        </label>
        <label className="flex-1 text-sm"><span className="text-fg-token">Fecha</span>
          <input aria-label="Fecha" type="time" value={close} onChange={(e) => setClose(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2 text-fg-token" />
        </label>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
        Salvar e continuar
      </button>
    </div>
  );
};
export default StepHours;
