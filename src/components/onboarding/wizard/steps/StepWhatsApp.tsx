import { useState, type FC } from 'react';
import { updateStore } from '../../../../services/storesApi';
import { Field, TextInput, formatBRPhone } from './fields';

const StepWhatsApp: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [num, setNum] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const digits = num.replace(/\D/g, '');
  async function save() {
    setBusy(true); setErr(null);
    try { await updateStore(storeId, { whatsapp_number: digits }); onSaved(); }
    catch { setErr('Não foi possível salvar.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">O número que recebe os pedidos da loja.</p>
      <Field label="WhatsApp" hint="Com DDD — é onde os pedidos chegam.">
        <TextInput value={num} onChange={(v) => setNum(formatBRPhone(v))} ariaLabel="WhatsApp" placeholder="(63) 99999-8888" />
      </Field>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || digits.length < 10}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50">
        {busy ? 'Salvando…' : 'Salvar e continuar'}
      </button>
    </div>
  );
};
export default StepWhatsApp;
