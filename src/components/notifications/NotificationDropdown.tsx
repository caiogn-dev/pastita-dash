import React, { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../../services/logger';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationsService, Notification } from '../../services/notifications';
import { useWS } from '../../context/WebSocketContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * Linha de opt-in de push DENTRO do dropdown de notificações — antes era um
 * segundo BellIcon idêntico ao lado deste na navbar (dois sinos iguais lado a
 * lado confundiam; agora existe um único centro de notificações).
 */
const PushToggleRow: React.FC = () => {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  if (permission === 'unsupported') return null;
  const denied = permission === 'denied';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border-token">
      <div className="min-w-0">
        <p className="text-sm text-fg-token">Push neste dispositivo</p>
        {denied && (
          <p className="text-xs text-fg-muted-token">Bloqueado nas permissões do navegador</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isSubscribed}
        aria-label={isSubscribed ? 'Desativar notificações push' : 'Ativar notificações push'}
        disabled={isLoading || denied}
        onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isSubscribed ? 'bg-brand' : 'bg-surface-2 border border-border-token'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isSubscribed ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
};

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { on } = useWS();

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notificationsService.getNotifications();
      setNotifications(response.data.results || []);
    } catch (error) {
      logger.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      logger.error('Error loading unread count:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    // Listen for new orders (which create notifications)
    const unsubOrder = on('order_created', () => {
      // Increment count and refresh after a delay
      setUnreadCount(prev => prev + 1);
      setTimeout(() => loadNotifications(), 1000);
    });

    return () => {
      unsubOrder();
    };
  }, [on, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      // markAsRead accepts string[] — pass all unread IDs at once
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) await notificationsService.markAsRead(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      logger.error('Error marking all as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead([id]);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Error marking as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'order':
        return '📦';
      case 'payment':
        return '💳';
      case 'conversation':
        return '👤';
      case 'alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
        className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface text-fg-token rounded-lg shadow-lg border border-border-token z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-token">
            <h3 className="font-semibold text-fg-token">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-brand hover:opacity-80 flex items-center gap-1"
              >
                <CheckIcon className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-fg-muted-token">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-fg-muted-token">
                <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-border-token hover:bg-surface-2 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-brand-soft' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-token truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-fg-muted-token line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-fg-muted-token mt-1">
                        {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-brand rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <PushToggleRow />
        </div>
      )}
    </div>
  );
};
