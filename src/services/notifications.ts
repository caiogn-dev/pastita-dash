/**
 * Notifications Service
 * Endpoints: /api/v1/notifications/
 */

import api from './api';

export interface Notification {
  id: string;
  notification_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  related_object_type?: string;
  related_object_id?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPreference {
  email_enabled: boolean;
  email_messages: boolean;
  email_orders: boolean;
  email_payments: boolean;
  email_system: boolean;
  push_enabled: boolean;
  push_messages: boolean;
  push_orders: boolean;
  push_payments: boolean;
  push_system: boolean;
  inapp_enabled: boolean;
  inapp_sound: boolean;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
}

export const getNotifications = (params?: {
  notification_type?: string;
  is_read?: boolean;
  priority?: string;
  page?: number;
}) => api.get('/notifications/', { params });

export const getUnreadCount = () =>
  api.get('/notifications/unread_count/');

export const markAsRead = (ids?: string[], markAll?: boolean) =>
  api.post('/notifications/mark_read/', {
    notification_ids: ids ?? [],
    mark_all: markAll ?? false,
  });

export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}/remove/`);

export const getPreferences = () =>
  api.get('/notifications/preferences/me/');

export const updatePreferences = (prefs: Partial<NotificationPreference>) =>
  api.patch('/notifications/preferences/update_preferences/', prefs);

export const registerPushSubscription = (data: {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
}) => api.post('/notifications/push/register/', data);

export const unregisterPushSubscription = (endpoint: string) =>
  api.post('/notifications/push/unregister/', { endpoint });

export const notificationsService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  registerPushSubscription,
  unregisterPushSubscription,
};

export default notificationsService;
