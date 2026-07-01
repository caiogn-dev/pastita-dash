import { useState, type FC } from 'react';
import { updateStoreWithFiles } from '../../../../services/storesApi';
import { LogoDropzone } from './fields';

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
      <LogoDropzone file={file} onFile={setFile} />
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={busy || !file}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-50">
        {busy ? 'Enviando…' : 'Salvar e continuar'}
      </button>
    </div>
  );
};
export default StepLogo;
