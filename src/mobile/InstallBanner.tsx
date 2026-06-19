// src/mobile/InstallBanner.tsx
import React, { useState } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useInstallPrompt } from './useInstallPrompt';

const KEY = 'cdx_install_dismissed';

export const InstallBanner: React.FC = () => {
  const { canInstall, promptInstall, isIOS, isStandalone } = useInstallPrompt();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  if (isStandalone || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="m-3 flex items-center gap-3 rounded-xl border border-border-primary bg-bg-card p-3">
      <ArrowDownTrayIcon className="h-6 w-6 shrink-0 text-brand-500" />
      <div className="flex-1 text-sm text-fg-secondary">
        {isIOS
          ? 'Instale o app: toque em Compartilhar → "Adicionar à Tela de Início".'
          : 'Instale o Cardapidex na tela inicial para acesso rápido.'}
      </div>
      {!isIOS && (
        <button type="button" onClick={promptInstall}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white">Instalar</button>
      )}
      <button type="button" aria-label="Dispensar" onClick={dismiss} className="p-3">
        <XMarkIcon className="h-5 w-5 text-fg-muted" />
      </button>
    </div>
  );
};
