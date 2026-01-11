import React, { useState, useEffect, useRef } from 'react';
import logger from '../../services/logger';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationsService, Notification } from '../../services/notifications';
import { useNotificationWebSocket } from '../../hooks/useWebSocket';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useNotificationWebSocket();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const unsubscribe = subscribe('notification', (data: unknown) => {
      const notification = (data as { notification: Notification }).notification;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationsService.getNotifications();
      setNotifications(response.results);
    } catch (error) {
      logger.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsService.getUnreadCount();
      setUnreadCount(response.count);
    } catch (error) {
      logger.error('Error loading unread count:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAsRead(undefined, true);
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
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <CheckIcon className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-green-50' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to notifications page
              }}
              className="text-sm text-green-600 hover:text-green-700 w-full text-center"
            >
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
