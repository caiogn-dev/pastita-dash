import { useState, type FC } from 'react';
import { updateStore } from '../../../../services/storesApi';
import { Field } from './fields';

const DIAS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TIME_CLS =
  'w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2.5 text-fg-token ' +
  'outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/30';

const StepHours: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [open, setOpen] = useState('09:00');
  const [close, setClose] = useState('18:00');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    const hours = Object.fromEntries(DIAS.map((d) => [d, { open, close, is_open: true }]));
    try { await updateStore(storeId, { operating_hours: hours }); onSaved(); }
    catch { setErr('Não foi possível salvar o horário.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">Um horário padrão pra todos os dias (ajuste depois nas configurações).</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Abre">
            <input aria-label="Abre" type="time" value={open} onChange={(e) => setOpen(e.target.value)} className={TIME_CLS} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Fecha">
            <input aria-label="Fecha" type="time" value={close} onChange={(e) => setClose(e.target.value)} className={TIME_CLS} />
          </Field>
        </div>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50">
        {busy ? 'Salvando…' : 'Salvar e continuar'}
      </button>
    </div>
  );
};
export default StepHours;
