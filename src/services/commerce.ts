/** 
 * Commerce Service - API endpoints para o novo backend
 * ATUALIZADO: Usando /stores/ em vez de /commerce/ (backend migrado - 2026-03-04)
 */
import api from './api';

// Stores
export const getStores = () => api.get('/stores/');
export const getStore = (slug: string) => api.get(`/stores/${slug}/`);
export const getStoreProducts = (slug: string) => api.get(`/stores/${slug}/products/`);

// Products
export const getProducts = (params?: { store?: string }) => api.get('/stores/products/', { params });
export const getProduct = (id: string) => api.get(`/stores/products/${id}/`);
export const createProduct = (data: any) => api.post('/stores/products/', data);
export const updateProduct = (id: string, data: any) => api.put(`/stores/products/${id}/`, data);
export const deleteProduct = (id: string) => api.delete(`/stores/products/${id}/`);
// Pausa rápida (item esgotado): minutes vazio = até amanhã
export const pauseProduct = (id: string, minutes?: number) =>
  api.post(`/stores/products/${id}/pause/`, minutes ? { minutes } : {});
export const unpauseProduct = (id: string) => api.post(`/stores/products/${id}/unpause/`, {});

// Categories
export const getCategories = () => api.get('/stores/categories/');
export const getCategory = (id: string) => api.get(`/stores/categories/${id}/`);

// Customers
export const getCustomers = () => api.get('/stores/customers/');
export const getCustomerByPhone = (phone: string) => api.get('/stores/customers/by_phone/', { params: { phone } });
export const createCustomer = (data: any) => api.post('/stores/customers/', data);

// Orders
export const getOrders = (params?: { store?: string }) => api.get('/stores/orders/', { params });
export const getOrder = (id: string) => api.get(`/stores/orders/${id}/`);
export const createOrder = (data: any) => {
  // Extract store slug/id from payload and use it in URL path
  const { store, delivery_address, ...payload } = data;
  if (!store) throw new Error('[createOrder] store is required');
  const storeSlug = store;

  // Convert delivery_address string to JSON object if needed
  const formattedData = {
    ...payload,
    delivery_address: typeof delivery_address === 'string'
      ? { address: delivery_address }
      : (delivery_address || {}),
  };

  return api.post(`/stores/${storeSlug}/orders/`, formattedData);
};

// Export
export const commerceService = {
  stores: {
    list: getStores,
    get: getStore,
    getProducts: getStoreProducts,
  },
  products: {
    list: getProducts,
    get: getProduct,
    create: createProduct,
    update: updateProduct,
    delete: deleteProduct,
  },
  categories: {
    list: getCategories,
    get: getCategory,
  },
  customers: {
    list: getCustomers,
    getByPhone: getCustomerByPhone,
    create: createCustomer,
  },
  orders: {
    list: getOrders,
    get: getOrder,
    create: createOrder,
  },
};

export default commerceService;
