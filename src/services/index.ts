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
export type {
  Produto,
  Molho,
  Carne,
  Rondelli,
  Combo,
  ComboItem,
  Pedido,
  PedidoItem,
  PedidoEndereco,
  Category,
  DashboardStats,
  MolhoInput,
  CarneInput,
  RondelliInput,
  ComboInput,
  PastitaStats,
  Catalogo,
} from './pastitaApi';
export {
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProdutos,
  getProduto,
  createProduto,
  updateProduto,
  deleteProduto,
  // Molhos
  getMolhos,
  getMolho,
  createMolho,
  updateMolho,
  deleteMolho,
  toggleMolhoActive,
  // Carnes
  getCarnes,
  getCarne,
  createCarne,
  updateCarne,
  deleteCarne,
  toggleCarneActive,
  // Rondellis
  getRondellis,
  getRondellisClassicos,
  getRondellisGourmet,
  getRondelli,
  createRondelli,
  updateRondelli,
  deleteRondelli,
  toggleRondelliActive,
  // Combos
  getCombos,
  getCombosDestaques,
  getCombo,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleComboActive,
  toggleComboDestaque,
  // Orders
  getPedidos,
  getPedido,
  getStatusPedido,
  updatePedidoStatus,
  getWhatsAppConfirmacao,
  // Categories
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  // Dashboard
  getDashboardStats,
  getPastitaStats,
  getCatalog,
  getCatalogo,
  // Toggle
  toggleProductActive,
  toggleProductFeatured,
} from './pastitaApi';

// Logger
export { default as logger } from './logger';
