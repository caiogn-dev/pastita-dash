/**
 * Unit tests for src/services/notifications.ts
 * Mocks the axios `api` instance so no real HTTP calls are made.
 */

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  registerPushSubscription,
  unregisterPushSubscription,
  getVapidPublicKey,
} from '../services/notifications';

// Mock the api module (default export is an axios instance).
// The factory must be self-contained because jest.mock is hoisted.
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../services/api';

// Cast after import (hoisting is resolved by this point)
const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = (api as any).delete as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notifications service', () => {
  describe('getNotifications', () => {
    it('calls GET /notifications/ with no params', () => {
      getNotifications();
      expect(mockGet).toHaveBeenCalledWith('/notifications/', { params: undefined });
    });

    it('passes filter params', () => {
      getNotifications({ is_read: false, notification_type: 'order' });
      expect(mockGet).toHaveBeenCalledWith('/notifications/', {
        params: { is_read: false, notification_type: 'order' },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('calls GET /notifications/unread_count/', () => {
      getUnreadCount();
      expect(mockGet).toHaveBeenCalledWith('/notifications/unread_count/');
    });
  });

  describe('markAsRead', () => {
    it('sends mark_all=true when no ids given', () => {
      markAsRead(undefined, true);
      expect(mockPost).toHaveBeenCalledWith('/notifications/mark_read/', {
        notification_ids: [],
        mark_all: true,
      });
    });

    it('sends specific ids with mark_all=false by default', () => {
      markAsRead(['abc', 'def']);
      expect(mockPost).toHaveBeenCalledWith('/notifications/mark_read/', {
        notification_ids: ['abc', 'def'],
        mark_all: false,
      });
    });
  });

  describe('deleteNotification', () => {
    it('calls DELETE /notifications/{id}/remove/', () => {
      deleteNotification('123e4567-e89b-12d3-a456-426614174000');
      expect(mockDelete).toHaveBeenCalledWith(
        '/notifications/123e4567-e89b-12d3-a456-426614174000/remove/'
      );
    });
  });

  describe('preferences', () => {
    it('getPreferences calls correct endpoint', () => {
      getPreferences();
      expect(mockGet).toHaveBeenCalledWith('/notifications/preferences/me/');
    });

    it('updatePreferences sends partial data', () => {
      updatePreferences({ push_orders: false });
      expect(mockPatch).toHaveBeenCalledWith(
        '/notifications/preferences/update_preferences/',
        { push_orders: false }
      );
    });
  });

  describe('push subscriptions', () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh_key: 'BNnT6HW...',
      auth_key: 'zEkV...',
      user_agent: 'Mozilla/5.0',
    };

    it('registerPushSubscription posts to /push/register/', () => {
      registerPushSubscription(subscription);
      expect(mockPost).toHaveBeenCalledWith('/notifications/push/register/', subscription);
    });

    it('unregisterPushSubscription posts endpoint to /push/unregister/', () => {
      unregisterPushSubscription(subscription.endpoint);
      expect(mockPost).toHaveBeenCalledWith('/notifications/push/unregister/', {
        endpoint: subscription.endpoint,
      });
    });

    it('getVapidPublicKey calls correct endpoint', () => {
      getVapidPublicKey();
      expect(mockGet).toHaveBeenCalledWith('/notifications/push/vapid-public-key/');
    });
  });
});
