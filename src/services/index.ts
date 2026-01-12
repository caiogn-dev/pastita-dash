export { default as api, getErrorMessage } from './api';
export { authService } from './auth';
export { dashboardService } from './dashboard';
export { whatsappService } from './whatsapp';
export { conversationsService } from './conversations';
export { ordersService } from './orders';
export { paymentsService } from './payments';
export { langflowService } from './langflow';
export { notificationsService } from './notifications';
export { auditService } from './audit';
export { campaignsService } from './campaigns';
export { couponsService } from './coupons';
export { deliveryService } from './delivery';
export { productsService } from './products';
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
  notificationWS,
  chatWS,
  dashboardWS,
  getWebSocketUrl,
  initializeWebSockets,
  disconnectWebSockets,
} from './websocket';
export { exportService } from './export';
export {
  scheduledMessagesService,
  reportSchedulesService,
  generatedReportsService,
} from './scheduling';

// Pastita API - Massas Artesanais
export { default as pastitaApi } from './pastitaApi';
export type {
  Produto,
  Molho,
  Carne,
  Rondelli,
  Combo,
  ItemCarrinho,
  ItemComboCarrinho,
  Carrinho,
  ItemPedido,
  ItemComboPedido,
  Pedido,
  Catalogo,
  ProdutoInput,
  MolhoInput,
  CarneInput,
  RondelliInput,
  ComboInput,
  PastitaStats,
} from './pastitaApi';
export {
  getCatalogo,
  getProdutos,
  getProduto,
  getMolhos,
  getMolho,
  createMolho,
  updateMolho,
  deleteMolho,
  getCarnes,
  getCarne,
  createCarne,
  updateCarne,
  deleteCarne,
  getRondellis,
  getRondellisClassicos,
  getRondellisGourmet,
  getRondelli,
  createRondelli,
  updateRondelli,
  deleteRondelli,
  getCombos,
  getCombosDestaques,
  getCombo,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleComboActive,
  toggleComboDestaque,
  getPedidos,
  getPedido,
  getStatusPedido,
  getWhatsAppConfirmacao,
  getPastitaStats,
} from './pastitaApi';

// Logger
export { default as logger } from './logger';
