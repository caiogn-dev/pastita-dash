/**
 * ConnectWhatsAppButton — Embedded Signup (Coexistence) oficial do Meta.
 *
 * Fluxo: FB.login(config_id, featureType='whatsapp_business_app_onboarding',
 * response_type='code') → o Meta mostra um QR que o lojista escaneia no app
 * WhatsApp Business → recebe `code` +, via postMessage (WA_EMBEDDED_SIGNUP),
 * o waba_id e phone_number_id → POST /whatsapp/accounts/embedded_signup/
 * (backend troca code→token, inscreve na WABA e vincula à loja).
 *
 * Coexistência NÃO usa PIN: a verificação é o QR, não SMS. Por isso enviamos
 * direto, sem pedir PIN.
 */
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as whatsappService from '../../services/whatsapp';
import { authService } from '../../services/auth';

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

  // Aguarda o postMessage do Embedded Signup popular waba_id + phone_number_id.
  // Ele costuma chegar antes do callback do FB.login, mas damos uma margem.
  const waitForSession = async (): Promise<boolean> => {
    for (let i = 0; i < 20; i++) {
      const { waba_id, phone_number_id } = sessionRef.current;
      if (waba_id && phone_number_id) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };

  const submit = async (code: string) => {
    const ok = await waitForSession();
    const { waba_id, phone_number_id } = sessionRef.current;
    if (!ok || !waba_id || !phone_number_id) {
      toast.error('Faltou WABA/número do fluxo. Refaça a conexão.');
      return;
    }
    setLoading(true);
    try {
      await whatsappService.embeddedSignup({
        code,
        waba_id,
        phone_number_id,
        store_id: storeId,
      });
      toast.success('WhatsApp conectado com sucesso! 🎉');
      onConnected?.();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error('Sua sessão expirou durante a conexão. Faça login e reconecte o WhatsApp.');
      } else {
        toast.error(e?.response?.data?.error || 'Falha ao conectar o WhatsApp.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fbLoginCallback = (response: any) => {
    const code = response?.authResponse?.code;
    if (code) {
      submit(code);
    } else {
      toast.error('Conexão cancelada (sem código do Embedded Signup).');
    }
  };

  const launch = async () => {
    // Guarda de sessão: o `code` do Embedded Signup é de uso único. Se a
    // sessão do painel estiver morta, o POST final leva 401 e o code é
    // queimado — o lojista escaneia o QR à toa. Validar ANTES de abrir o Meta.
    try {
      await authService.getCurrentUser();
    } catch {
      toast.error('Sua sessão expirou. Faça login novamente e reconecte o WhatsApp.');
      return;
    }
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
      // featureType: dispara o fluxo de Coexistence (QR no app WhatsApp Business).
      // O valor 'coexistence' foi descontinuado pelo Meta — usar 'whatsapp_business_app_onboarding'.
      extras: { version: 'v4', featureType: 'whatsapp_business_app_onboarding' },
    });
  };

  return (
    <button
      type="button"
      onClick={launch}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-[#1877f2] px-4 h-10 text-sm font-bold text-white hover:bg-[#166fe0] transition-colors disabled:opacity-60"
    >
      <span aria-hidden>🟢</span>{' '}
      {loading ? 'Conectando…' : 'Conectar WhatsApp (oficial)'}
    </button>
  );
};

export default ConnectWhatsAppButton;
