// =============================================================================
// CORE SERVICES
// =============================================================================

export { default as api, getErrorMessage } from './api';
export { authService } from './auth';
export { dashboardService } from './dashboard';
export { default as logger } from './logger';

// =============================================================================
// COMMUNICATION SERVICES
// =============================================================================

export { whatsappService } from './whatsapp';
export { conversationsService } from './conversations';
export { notificationsService } from './notifications';
export {
  notificationWS,
  chatWS,
  dashboardWS,
  getWebSocketUrl,
  initializeWebSockets,
  disconnectWebSockets,
} from './websocket';

// =============================================================================
// BUSINESS SERVICES
// =============================================================================

export { ordersService } from './orders';
export { couponsService } from './coupons';
export { deliveryService } from './delivery';

// =============================================================================
// AUTOMATION & AI
// =============================================================================

export { langflowService } from './langflow';
export { auditService } from './audit';
export {
  companyProfileApi,
  autoMessageApi,
  customerSessionApi,
  automationLogApi,
  eventTypeLabels,
  businessTypeLabels,
  sessionStatusLabels,
  messageVariables,
} from './automation';
export {
  scheduledMessagesService,
  reportSchedulesService,
  generatedReportsService,
} from './scheduling';
export { exportService } from './export';
