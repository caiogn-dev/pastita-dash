import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export interface InstallPrompt {
  canInstall: boolean;
  promptInstall: () => void;
  isIOS: boolean;
  isStandalone: boolean;
}

export function useInstallPrompt(): InstallPrompt {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred.current) return;
    deferred.current.prompt();
    deferred.current = null;
    setCanInstall(false);
  }, []);

  return { canInstall, promptInstall, isIOS, isStandalone };
}
