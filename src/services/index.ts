/**
 * Services Index - Exports atualizados para API V2
 */

// Core
export { default as api, getErrorMessage, setAuthToken } from './api';

// 🆕 Novos serviços V2 (endpoints atualizados)
export { commerceService } from './commerce';
export { default as messagingService } from './messaging';
export { default as messengerService } from './messenger';
export { marketingService } from './marketingService';

// 🔄 Serviços legados mantidos temporariamente para compatibilidade
// Serão migrados gradualmente para os novos serviços acima
export { default as whatsappService } from './whatsapp';
export { conversationsService } from './conversations';
export { default as agentsService } from './agents';
export { ordersService } from './orders';
export { paymentsService } from './payments';
export { productsService } from './products';
export { exportService } from './export';
export { notificationsService } from './notifications';
export { dashboardService } from './dashboard';
export { auditService } from './audit';
export { authService } from './auth';
export { companyProfileService } from './automation';
export { scheduledMessagesService } from './scheduling';

// Labels e constantes
export { intentService } from './intents';
export { intentTypeLabels } from './automation';

// Instagram - exportar tudo
export * from './instagram';

// WebSocket
export {
  notificationWS,
  chatWS,
  dashboardWS,
  getWebSocketUrl,
  initializeWebSockets,
  disconnectWebSockets,
} from './websocket';

// Realtime
export {
  RealtimeConnection,
  createRealtimeConnection,
  getGlobalConnection,
  setGlobalConnection,
  detectTransportCapabilities,
  isTransportSupported,
  getWebSocketUrl as getRealtimeUrl,
} from './realtime';
export type {
  TransportType,
  ConnectionStatus,
  TransportCapabilities,
} from './realtime';
