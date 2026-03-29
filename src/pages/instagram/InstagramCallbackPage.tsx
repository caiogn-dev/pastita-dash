/**
 * InstagramCallbackPage
 *
 * Recebe o authorization code do Instagram Business Login OAuth.
 * O backend relaia o code para cá via redirect.
 * Esta página troca o code pela conta e fecha o popup (ou redireciona).
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { instagramAccountService } from '@/services';

const InstagramCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      const msg = error || 'Autorização cancelada';
      if (window.opener) {
        window.opener.postMessage({ type: 'instagram_oauth', error: msg }, window.location.origin);
        window.close();
      } else {
        navigate('/instagram/accounts', { replace: true });
      }
      return;
    }

    instagramAccountService
      .connect({ code })
      .then(() => {
        if (window.opener) {
          window.opener.postMessage({ type: 'instagram_oauth', success: true }, window.location.origin);
          window.close();
        } else {
          navigate('/instagram/accounts', { replace: true });
        }
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Erro ao conectar conta');
        if (window.opener) {
          window.opener.postMessage({ type: 'instagram_oauth', error: msg }, window.location.origin);
          window.close();
        } else {
          navigate('/instagram/accounts', { replace: true });
        }
      });
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
