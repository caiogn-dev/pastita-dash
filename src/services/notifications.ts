import api from './api';

/**
 * Notifications Service - API V2
 */

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  notification_type: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  // Email
  email_enabled: boolean;
  email_messages: boolean;
  email_orders: boolean;
  email_payments: boolean;
  email_system: boolean;
  // Push
  push_enabled: boolean;
  push_messages: boolean;
  push_orders: boolean;
  push_payments: boolean;
  push_system: boolean;
  // In-app
  inapp_enabled: boolean;
  inapp_sound: boolean;
}

export const getNotifications = () =>
  api.get('/notifications/');

// NOTA: Endpoint /unread_count/ não existe no backend atual
// Usando filtro na listagem principal para obter não lidas
export const getUnreadCount = () =>
  api.get('/notifications/', { params: { is_read: false, limit: 1 } });

export const markAsRead = (id?: string, all?: boolean) => {
  if (all) {
    return api.post('/notifications/mark-all-read/');
  }
  return api.patch(`/notifications/${id}/read/`);
};

export const markAllAsRead = () =>
  api.post('/notifications/mark-all-read/');

export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}/`);

export const getPreferences = () =>
  api.get('/notifications/preferences/');

export const updatePreferences = (prefs: Partial<NotificationPreference>) =>
  api.patch('/notifications/preferences/', prefs);

export const notificationsService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
};

export default notificationsService;
