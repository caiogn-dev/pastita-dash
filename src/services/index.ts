// =============================================================================
// CORE SERVICES
// =============================================================================

export { default as api, getErrorMessage } from './api';
export { authService } from './auth';
export { dashboardService } from './dashboard';
export { default as logger } from './logger';

// =============================================================================
// STORE API (Multi-tenant) - NEW ARCHITECTURE
// =============================================================================

export { 
  storeApi, 
  useStoreApi,
  getActiveStoreSlug,
  type Product,
  type Category,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
  type DeliveryMethod,
  type DeliveryAddress,
  type Coupon,
  type DeliveryZone,
  type DashboardStats as StoreDashboardStats,
  type ApiParams,
  type PaginatedResponse,
} from './storeApi';

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
export { paymentsService } from './payments';
export { couponsService } from './coupons';
export { deliveryService } from './delivery';
export { productsService } from './products';

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

// =============================================================================
// LEGACY API (Deprecated - use storeApi instead)
// =============================================================================

// @deprecated Use storeApi instead - these exports are for backwards compatibility
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
  Category as LegacyCategory,
  DashboardStats as LegacyDashboardStats,
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
