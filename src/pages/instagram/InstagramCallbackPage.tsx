/**
 * InstagramCallbackPage
 *
 * O Django já trocou o code por token e criou a conta.
 * Esta página só precisa fechar o popup e notificar o opener.
 *
 * Parâmetros esperados:
 *   ?ig_connected=1  → sucesso
 *   ?ig_error=xxx    → erro descritivo
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const InstagramCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('ig_connected');
    const igError = params.get('ig_error');

    const notify = (msg: { type: string; success?: boolean; error?: string }) => {
      if (window.opener) {
        try {
          window.opener.postMessage(msg, window.location.origin);
        } catch (_) { /* opener fechou */ }
        window.close();
      } else {
        navigate('/instagram/accounts', { replace: true });
      }
    };

    if (connected) {
      notify({ type: 'instagram_oauth', success: true });
    } else if (igError) {
      const label =
        igError === 'token_exchange_failed' ? 'Falha ao trocar token com o Instagram.' :
        igError === 'invalid_state' ? 'Sessão expirada. Tente novamente.' :
        igError === 'no_instagram_id' ? 'Conta Instagram não encontrada. Certifique-se de usar uma conta Business ou Creator.' :
        igError === 'authorization_failed' ? 'Autorização cancelada.' :
        decodeURIComponent(igError);
      notify({ type: 'instagram_oauth', error: label });
    } else {
      // Sem parâmetros — apenas fecha/redireciona
      notify({ type: 'instagram_oauth', error: 'Autorização cancelada.' });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Conectando conta Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallbackPage;
