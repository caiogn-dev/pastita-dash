/**
 * InstagramCallbackPage
 *
 * Handles the OAuth redirect from Facebook after the user authorises access.
 * This page is opened in a popup via InstagramAccountsPage.handleConnect().
 * On success/failure it posts a message to the opener and closes itself.
 */
import React, { useEffect, useRef } from 'react';
import { instagramAccountService } from '@/services';

const InstagramCallbackPage: React.FC = () => {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorReason = params.get('error_reason');

    if (error || errorReason || !code) {
      const msg = error || errorReason || 'Autorização cancelada';
      if (window.opener) {
        window.opener.postMessage({ type: 'INSTAGRAM_OAUTH_ERROR', error: msg }, window.location.origin);
      }
      window.close();
      return;
    }

    const redirectUri = `${window.location.origin}/instagram/callback`;

    instagramAccountService
      .connect({ code, redirect_uri: redirectUri })
      .then(() => {
        if (window.opener) {
          window.opener.postMessage({ type: 'INSTAGRAM_OAUTH_SUCCESS' }, window.location.origin);
        }
        window.close();
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Erro ao conectar conta';
        if (window.opener) {
          window.opener.postMessage(
            { type: 'INSTAGRAM_OAUTH_ERROR', error: message },
            window.location.origin,
          );
        }
        window.close();
      });
  }, []);

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
