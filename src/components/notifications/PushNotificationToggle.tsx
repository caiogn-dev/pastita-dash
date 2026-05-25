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
          ? 'border-orange-400 bg-orange-50 text-orange-500 hover:bg-orange-100 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
          : 'border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white',
        permission === 'denied' ? 'cursor-not-allowed opacity-50' : '',
        isLoading ? 'animate-pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="h-5 w-5" />
      {error && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
      )}
    </button>
  );
};
