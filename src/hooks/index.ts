// WebSocket hooks
export {
  useNotificationWebSocket,
  useDashboardWebSocket,
  useChatWebSocket,
} from './useWebSocket';
export { useAutomationWS } from './useAutomationWS';
export { useOrdersWebSocket } from './useOrdersWebSocket';

// Store context hook
export { 
  useStore, 
  getStoreId, 
  getStoreSlug, 
  getStoreIdWithFallback 
} from './useStore';
export type { UseStoreReturn } from './useStore';
