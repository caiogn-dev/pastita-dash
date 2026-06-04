/**
 * TDD WebSocket Client Tests - RED Phase
 * 
 * Requirements:
 * - Connect to backend WebSocket with auth token
 * - Reconnect on disconnect
 * - Subscribe/unsubscribe from events
 * - Handle order.created, order.updated, payment_received
 * - Heartbeat response (pong)
 * - Error resilience
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from './websocket';

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockWs: WebSocket;

  beforeEach(() => {
    // Mock WebSocket
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 1, // OPEN
    } as unknown as WebSocket;

    global.WebSocket = vi.fn(() => mockWs) as any;
  });

  afterEach(() => {
    if (client) client.disconnect();
  });

  it('should connect with auth token', async () => {
    // RED: Connect requires token in URL
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'test-token-123',
      storeSlug: 'test-store',
    });

    await client.connect();

    expect(global.WebSocket).toHaveBeenCalledWith(
      'ws://localhost:8000/ws/stores/test-store/orders/?token=test-token-123'
    );
  });

  it('should emit connected event on successful connection', (done) => {
    // RED: Should notify when connected
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-a',
    });

    client.on('connected', () => {
      expect(true).toBe(true);
      done();
    });

    client.connect();
    // Simulate WebSocket open event
    const openHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'open'
    );
    if (openHandler) openHandler[1]();
  });

  it('should subscribe to order events', async () => {
    // RED: Subscribe should register handler
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-b',
    });

    const orderCreatedHandler = vi.fn();
    client.subscribe('order.created', orderCreatedHandler);

    // Simulate incoming event
    const messageHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'message'
    );
    if (messageHandler) {
      messageHandler[1]({
        data: JSON.stringify({
          type: 'order.created',
          order_id: 123,
          status: 'pending',
        }),
      });
    }

    expect(orderCreatedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 123,
        status: 'pending',
      })
    );
  });

  it('should handle order.updated events', async () => {
    // RED: Listen to status changes
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-c',
    });

    const updatedHandler = vi.fn();
    client.subscribe('order.updated', updatedHandler);

    // Simulate update event
    const messageHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'message'
    );
    if (messageHandler) {
      messageHandler[1]({
        data: JSON.stringify({
          type: 'order.updated',
          order_id: 456,
          status: 'confirmed',
          updated_at: '2026-06-04T14:00:00Z',
        }),
      });
    }

    expect(updatedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 456,
        status: 'confirmed',
      })
    );
  });

  it('should respond to heartbeat ping with pong', async () => {
    // RED: Keep connection alive
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-d',
    });

    await client.connect();

    // Simulate heartbeat ping from server
    const messageHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'message'
    );
    if (messageHandler) {
      messageHandler[1]({
        data: JSON.stringify({
          type: 'ping',
          timestamp: '2026-06-04T14:00:00Z',
        }),
      });
    }

    // Should send pong response
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"pong"')
    );
  });

  it('should reconnect on disconnect', async () => {
    // RED: Auto-reconnect with exponential backoff
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-e',
      reconnectDelay: 100, // Fast for tests
    });

    await client.connect();

    // Simulate disconnect
    const closeHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'close'
    );
    if (closeHandler) closeHandler[1]();

    // Should attempt reconnect
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe from events', async () => {
    // RED: Stop receiving events
    client = new WebSocketClient({
      url: 'ws://localhost:8000',
      token: 'token-123',
      storeSlug: 'store-f',
    });

    const handler = vi.fn();
    const subId = client.subscribe('order.created', handler);

    // Unsubscribe
    client.unsubscribe(subId);

    // Simulate event after unsubscribe
    const messageHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'message'
    );
    if (messageHandler) {
      messageHandler[1]({
        data: JSON.stringify({
          type: 'order.created',
          order_id: 789,
        }),
      });
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('should emit error on connection failure', (done) => {
    // RED: Notify on errors
    client = new WebSocketClient({
      url: 'ws://invalid-host',
      token: 'token-123',
      storeSlug: 'store-g',
    });

    client.on('error', (error) => {
      expect(error).toBeDefined();
      done();
    });

    client.connect();

    // Simulate error
    const errorHandler = (mockWs.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'error'
    );
    if (errorHandler) errorHandler[1](new Error('Connection failed'));
  });
});
