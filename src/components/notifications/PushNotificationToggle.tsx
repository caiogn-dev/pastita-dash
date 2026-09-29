/**
 * PushNotificationToggle
 *
 * Small icon button in the header toolbar that lets the user
 * enable / disable Web Push notifications for this device.
 */
import React from 'react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export const PushNotificationToggle: React.FC = () => {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (permission === 'unsupported') return null;

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const title = isSubscribed
    ? 'Desativar notificações push'
    : permission === 'denied'
    ? 'Notificações bloqueadas pelo navegador'
    : 'Ativar notificações push';

  const Icon = isSubscribed ? BellSolidIcon : permission === 'denied' ? BellSlashIcon : BellIcon;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || permission === 'denied'}
      title={title}
      aria-label={title}
      className={[
        'relative rounded-lg border p-2 transition',
        isSubscribed
          ? 'border-warning-token bg-warning-soft text-warning-token hover:brightness-110   '
          : 'border-border-token bg-white/70 text-fg-muted-token hover:border-border-token hover:text-fg-token dark:hover:text-white',
        permission === 'denied' ? 'cursor-not-allowed opacity-50' : '',
        isLoading ? 'animate-pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="h-5 w-5" />
      {error && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger-token" />
      )}
    </button>
  );
};
