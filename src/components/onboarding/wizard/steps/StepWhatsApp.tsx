import { useState, type FC } from 'react';
import { updateStore } from '../../../../services/storesApi';
import { ConnectWhatsAppButton } from '../../../whatsapp/ConnectWhatsAppButton';
import { Field, TextInput, formatBRPhone } from './fields';

/**
 * O passo do WhatsApp no primeiro acesso.
 *
 * Antes ele só pedia o número e dava o passo por concluído. Em 22/09 medimos o
 * estrago: quatro das seis lojas tinham o passo VERDE e nenhuma WABA
 * conectada — uma delas com o próprio `waba_id` quebrado colado no campo de
 * telefone. Número escrito não recebe mensagem.
 *
 * Agora a ação principal é CONECTAR. O número continua aqui porque é o
 * contato que aparece na vitrine e no vale por link — mas ele é o passo
 * secundário, e a tela diz isso.
 */
const StepWhatsApp: FC<{ storeId: string; onSaved: () => void }> = ({ storeId, onSaved }) => {
  const [num, setNum] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const digits = num.replace(/\D/g, '');

  async function salvarNumero() {
    setBusy(true); setErr(null);
    try { await updateStore(storeId, { whatsapp_number: digits }); onSaved(); }
    catch { setErr('Não foi possível salvar.'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-fg-token">
          Conecte o WhatsApp Business da sua loja para atender e vender por lá.
        </p>
        <p className="mt-1 text-sm text-fg-muted-token">
          A conta continua sendo sua: as conversas e a cobrança das mensagens
          ficam no seu WhatsApp, não no nosso.
        </p>
        <div className="mt-3">
          <ConnectWhatsAppButton onConnected={onSaved} />
        </div>
      </div>

      <div className="border-t border-border-token pt-4">
        <p className="text-sm text-fg-muted-token">
          Ainda não quer conectar? Deixe ao menos o número de contato — ele
          aparece na sua vitrine.
        </p>
        <Field label="WhatsApp de contato" hint="Com DDD.">
          <TextInput
            value={num}
            onChange={(v) => setNum(formatBRPhone(v))}
            ariaLabel="WhatsApp de contato"
            placeholder="(63) 99999-8888"
          />
        </Field>
        {err && <p className="text-sm text-danger-token">{err}</p>}
        <button
          onClick={salvarNumero}
          disabled={busy || digits.length < 10}
          className="controle mt-2 w-full rounded-lg px-4 py-2.5 font-medium transition-opacity disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar número e continuar'}
        </button>
      </div>
    </div>
  );
};
export default StepWhatsApp;
