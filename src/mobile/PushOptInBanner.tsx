import React, { useState } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const PushOptInBanner: React.FC = () => {
  const { permission, isSubscribed, isLoading, error, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('cdx_push_dismissed') === '1'; } catch { return false; }
  });

  if (isSubscribed || dismissed) return null;
  if (permission === 'denied' || permission === 'unsupported') return null;

  const dismiss = () => {
    try { localStorage.setItem('cdx_push_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="m-3 flex items-center gap-3 rounded-xl bg-bg-card border border-border-primary p-3">
      <BellAlertIcon className="h-6 w-6 text-brand-500 shrink-0" />
      <div className="flex-1 text-sm text-fg-secondary">
        Ative as notificações para saber na hora quando entrar um pedido.
        {error && <span className="text-xs text-danger-500">{error}</span>}
      </div>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => subscribe()}
        className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isLoading ? '...' : 'Ativar notificações'}
      </button>
      <button type="button" aria-label="Dispensar" onClick={dismiss} className="p-3">
        <XMarkIcon className="h-5 w-5 text-fg-muted" />
      </button>
    </div>
  );
};
