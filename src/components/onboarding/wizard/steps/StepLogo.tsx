import { useState, type FC } from 'react';
import { updateStoreWithFiles } from '../../../../services/storesApi';

const StepLogo: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!file) return;
    setBusy(true); setErr(null);
    try { await updateStoreWithFiles(storeId, { logo: file }); onSaved(); }
    catch { setErr('Não foi possível enviar a logo.'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted-token">A marca que aparece no topo da sua loja.</p>
      <input aria-label="Logo" type="file" accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-fg-muted-token" />
      {file && <p className="text-sm text-fg-token">{file.name}</p>}
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || !file}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
        Salvar e continuar
      </button>
    </div>
  );
};
export default StepLogo;
