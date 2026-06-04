# WebSocket Real-Time Integration Guide

Complete guide to real-time order updates via WebSocket.

## Architecture

```
Frontend (React)               Backend (Django)
   ↓                                  ↓
   useRealTimeOrders         OrderConsumer
   ↓                                  ↓
   WebSocketClient ←→ WebSocket ←→ Django Channels
   ↓                                  ↓
   Zustand rootStore         Channel Groups
   ↓
   UI re-renders
```

## Setup

### Backend Requirements
- Django Channels configured (`apps/core/routing.py`)
- Redis for channel layer
- OrderConsumer in `apps/stores/consumers.py`
- Auth token validation in `apps/core/websocket_auth.py`

### Frontend Setup

1. **Environment variables** (`.env`):
```
VITE_WS_URL=ws://localhost:8000
VITE_API_URL=http://localhost:8000
```

2. **Install dependencies**:
```bash
npm install uuid @testing-library/react-hooks
```

3. **Add to component**:
```tsx
import { useRealTimeOrders } from '@/hooks/useRealTimeOrders';

export function OrdersPage() {
  const { isConnected, reconnect, refreshOrders } = useRealTimeOrders({
    enabled: true,
    apiUrl: import.meta.env.VITE_API_URL!,
    wsUrl: import.meta.env.VITE_WS_URL!,
  });

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      {/* Orders list */}
    </div>
  );
}
```

## Usage

### Basic Real-Time Orders
```tsx
function OrdersPage() {
  const { isConnected, reconnect, refreshOrders } = useRealTimeOrders({
    enabled: true,
    apiUrl: 'http://api.example.com',
    wsUrl: 'ws://api.example.com',
  });

  useEffect(() => {
    refreshOrders(); // Manual refresh
  }, []);

  return (
    <div>
      <span>{isConnected ? '🟢 Live' : '🔴 Offline'}</span>
      {!isConnected && <button onClick={reconnect}>Reconnect</button>}
    </div>
  );
}
```

### Direct WebSocket Usage
```tsx
import { useWebSocket } from '@/services/websocket';

function CustomComponent() {
  const ws = useWebSocket({
    url: 'ws://api.example.com',
    token: authToken,
    storeSlug: 'my-store',
  });

  useEffect(() => {
    ws.connect();

    const subId = ws.subscribe('order.created', (event) => {
      console.log('New order:', event.order_id);
    });

    ws.on('connected', () => console.log('Connected'));
    ws.on('error', (err) => console.error('Error:', err));

    return () => {
      ws.unsubscribe(subId);
      ws.disconnect();
    };
  }, []);
}
```

## Events

### Incoming Events (Server → Client)

#### order.created
```json
{
  "type": "order.created",
  "order_id": 123,
  "status": "pending",
  "total": "99.99",
  "timestamp": "2026-06-04T14:00:00Z"
}
```

#### order.updated
```json
{
  "type": "order.updated",
  "order_id": 123,
  "status": "confirmed",
  "updated_at": "2026-06-04T14:05:00Z"
}
```

#### order.payment_received
```json
{
  "type": "order.payment_received",
  "order_id": 123,
  "amount": "99.99",
  "payment_method": "pix",
  "timestamp": "2026-06-04T14:10:00Z"
}
```

#### ping (heartbeat)
```json
{
  "type": "ping",
  "timestamp": "2026-06-04T14:15:00Z"
}
```

### Outgoing Events (Client → Server)

#### pong (heartbeat response)
```json
{
  "type": "pong",
  "timestamp": "2026-06-04T14:15:00Z"
}
```

## Connection Flow

1. **Authentication**
   - Token sent in WebSocket URL query param
   - Backend validates before accepting connection
   - 4001 close code = auth failed

2. **Connected**
   - Client can subscribe to events
   - Heartbeat starts (30s interval)
   - Channel group joins

3. **Real-Time Updates**
   - Server broadcasts to channel group
   - Client receives via type handlers
   - Zustand store updates automatically

4. **Disconnect**
   - Client receives close event
   - Auto-reconnect with exponential backoff
   - Graceful error handling

## Reconnection

Auto-reconnect with exponential backoff:
- 1st attempt: 3s
- 2nd attempt: 6s
- 3rd attempt: 12s
- 4th attempt: 24s
- 5th attempt: 48s
- Max: 5 attempts

Override:
```tsx
const ws = useWebSocket({
  reconnectDelay: 5000,      // 5s base
  maxReconnectAttempts: 10,  // 10 tries
});
```

## Error Handling

```tsx
const { isConnected, reconnect } = useRealTimeOrders({ ... });

if (!isConnected) {
  return (
    <div>
      Connection lost
      <button onClick={reconnect}>Reconnect</button>
    </div>
  );
}
```

## Testing

### Unit Tests
```bash
npm test src/services/websocket.test.ts
```

### E2E Tests
```bash
# Requires app + backend running
npm run test:e2e
```

## Production Checklist

- [ ] WSS (secure WebSocket) enabled on prod
- [ ] CORS configured for WebSocket origin
- [ ] Rate limiting applied to WebSocket
- [ ] Heartbeat timeout set (30s)
- [ ] Max reconnect attempts configured
- [ ] Error logging/monitoring set up
- [ ] Load balancing handles sticky sessions (for Channels)
- [ ] Redis cluster for channel layer
- [ ] SSL certificates valid

## Troubleshooting

### WebSocket keeps disconnecting
- Check Redis connection on backend
- Verify token validity
- Check server logs for errors
- Increase heartbeat timeout

### Orders not updating in real-time
- Verify Channels consumer is receiving events
- Check browser DevTools Network tab for WebSocket
- Confirm event type matches subscription
- Check for JavaScript errors in console

### High memory usage
- Verify WebSocket properly closes
- Check for uncleared subscriptions
- Monitor channel group size
- Set max connections limit

## Performance Tips

1. **Batch updates**: Don't refresh orders on every event, debounce
2. **Selective subscriptions**: Only subscribe to needed events
3. **Unsubscribe**: Always clean up subscriptions
4. **Connection pooling**: Reuse single WebSocket per store
5. **Message size**: Keep event payloads small

## API Reference

### WebSocketClient

```typescript
class WebSocketClient {
  // Connect/disconnect
  connect(): Promise<void>
  disconnect(): void

  // Events
  subscribe(eventType: string, handler: EventHandler): string
  unsubscribe(subscriptionId: string): boolean
  on(event: 'connected' | 'disconnected' | 'error', handler: Function): void
  off(event: string, handler: Function): void
}

// Factory
useWebSocket(config: WebSocketConfig): WebSocketClient
clearWebSocketInstance(): void
```

### useRealTimeOrders Hook

```typescript
function useRealTimeOrders(config: {
  enabled?: boolean
  apiUrl: string
  wsUrl: string
}): {
  isConnected: boolean
  reconnect(): Promise<void>
  refreshOrders(): Promise<void>
}
```

## Further Reading

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [WebSocket API MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Reconnection Strategies](https://github.com/joewalnes/reconnecting-websocket)
