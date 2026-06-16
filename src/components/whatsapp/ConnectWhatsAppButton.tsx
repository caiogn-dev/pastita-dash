/**
 * ConnectWhatsAppButton — Embedded Signup (Coexistence) oficial do Meta.
 *
 * Fluxo: FB.login(config_id, response_type='code') → recebe `code` +,
 * via postMessage (WA_EMBEDDED_SIGNUP), o waba_id e phone_number_id →
 * pede um PIN (2FA do número) → POST /whatsapp/accounts/embedded_signup/
 * (backend troca code→token, registra, inscreve na WABA e vincula à loja).
 */
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as whatsappService from '../../services/whatsapp';

const FB_APP_ID = import.meta.env.VITE_META_APP_ID || '2233885800471071';
const ES_CONFIG_ID = import.meta.env.VITE_META_ES_CONFIG_ID || '1695683531769984';
const GRAPH_VERSION = 'v21.0';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

function loadFbSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
      resolve();
    };
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return; // já carregando
    const js = document.createElement('script');
    js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.async = true;
    js.defer = true;
    js.onerror = () => reject(new Error('Falha ao carregar o SDK do Facebook'));
    document.body.appendChild(js);
  });
}

interface Props {
  storeId?: string;
  onConnected?: () => void;
}

export const ConnectWhatsAppButton: React.FC<Props> = ({ storeId, onConnected }) => {
  const sessionRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Listener do postMessage do Embedded Signup (traz waba_id + phone_number_id)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          sessionRef.current = {
            waba_id: data?.data?.waba_id,
            phone_number_id: data?.data?.phone_number_id,
          };
        }
      } catch {
        /* mensagem não-JSON do FB — ignora */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const fbLoginCallback = (response: any) => {
    const code = response?.authResponse?.code;
    if (code) {
      setPendingCode(code); // abre o modal de PIN
    } else {
      toast.error('Conexão cancelada (sem código do Embedded Signup).');
    }
  };

  const launch = async () => {
    try {
      await loadFbSdk();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível carregar o Facebook.');
      return;
    }
    if (!window.FB) {
      toast.error('SDK do Facebook indisponível.');
      return;
    }
    sessionRef.current = {};
    window.FB.login(fbLoginCallback, {
      config_id: ES_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: { version: 'v4' },
    });
  };

  const finish = async () => {
    const { waba_id, phone_number_id } = sessionRef.current;
    if (!pendingCode || !waba_id || !phone_number_id) {
      toast.error('Faltou code/WABA/número do fluxo. Refaça a conexão.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('O PIN deve ter 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      await whatsappService.embeddedSignup({
        code: pendingCode,
        waba_id,
        phone_number_id,
        pin,
        store_id: storeId,
      });
      toast.success('WhatsApp conectado com sucesso! 🎉');
      setPendingCode(null);
      setPin('');
      onConnected?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao conectar o WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={launch}
        className="inline-flex items-center gap-2 rounded-md bg-[#1877f2] px-4 h-10 text-sm font-bold text-white hover:bg-[#166fe0] transition-colors"
      >
        <span aria-hidden>🟢</span> Conectar WhatsApp (oficial)
      </button>

      {pendingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Defina o PIN do número
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
              Um PIN de 6 dígitos (verificação em duas etapas). Guarde-o — será
              pedido se o número precisar ser re-registrado.
            </p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-transparent px-3 h-11 text-lg tracking-widest text-center mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPendingCode(null); setPin(''); }}
                className="px-3 h-9 rounded-md text-sm text-gray-600 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={finish}
                disabled={loading || pin.length !== 6}
                className="px-4 h-9 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Conectando…' : 'Finalizar conexão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConnectWhatsAppButton;
