/**
 * Notifications Service - API V2
 * 
 * NOTA: O endpoint /notifications/ não existe no backend atual.
 * Todos os métodos foram modificados para retornar dados vazios/mockados
 * até que o backend implemente o sistema de notificações.
 */

import api from './api';

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

// NOTA: Endpoint /notifications/ não existe no backend atual
// Retornando dados vazios até implementação
export const getNotifications = () =>
  Promise.resolve({ data: { results: [], count: 0 } });

// NOTA: Endpoint /unread_count/ não existe no backend atual
export const getUnreadCount = () =>
  Promise.resolve({ data: { count: 0 } });

// NOTA: Endpoint não existe - mockado
export const markAsRead = (id?: string, all?: boolean) => {
  if (all) {
    return Promise.resolve({ data: { success: true } });
  }
  return Promise.resolve({ data: { success: true, id } });
};

// NOTA: Endpoint não existe - mockado
export const markAllAsRead = () =>
  Promise.resolve({ data: { success: true } });

// NOTA: Endpoint não existe - mockado
export const deleteNotification = (id: string) =>
  Promise.resolve({ data: { success: true, id } });

// NOTA: Endpoint não existe - mockado com id
export const getPreferences = () =>
  Promise.resolve({ 
    data: { 
      id: 'default',
      email_enabled: false,
      email_messages: false,
      email_orders: false,
      email_payments: false,
      email_system: false,
      push_enabled: false,
      push_messages: false,
      push_orders: false,
      push_payments: false,
      push_system: false,
      inapp_enabled: true,
      inapp_sound: false,
    } 
  });

// NOTA: Endpoint não existe - mockado com id
export const updatePreferences = (prefs: Partial<NotificationPreference>) =>
  Promise.resolve({ data: { 
    id: 'default',
    email_enabled: prefs.email_enabled ?? false,
    email_messages: prefs.email_messages ?? false,
    email_orders: prefs.email_orders ?? false,
    email_payments: prefs.email_payments ?? false,
    email_system: prefs.email_system ?? false,
    push_enabled: prefs.push_enabled ?? false,
    push_messages: prefs.push_messages ?? false,
    push_orders: prefs.push_orders ?? false,
    push_payments: prefs.push_payments ?? false,
    push_system: prefs.push_system ?? false,
    inapp_enabled: prefs.inapp_enabled ?? true,
    inapp_sound: prefs.inapp_sound ?? false,
  }});

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
