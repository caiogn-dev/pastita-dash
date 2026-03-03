/**
 * Commerce Service - API endpoints para o novo backend
 * ATUALIZADO: Usando /commerce/ em vez de /commerce/
 */
import api from './api';

// Stores
export const getStores = () => api.get('/commerce/');
export const getStore = (slug: string) => api.get(`/commerce/${slug}/`);
export const getStoreProducts = (slug: string) => api.get(`/commerce/${slug}/products/`);

// Products
export const getProducts = (params?: { store?: string }) => 
  api.get('/commerce/products/', { params });
export const getProduct = (id: string) => api.get(`/commerce/products/${id}/`);
export const createProduct = (data: any) => api.post('/commerce/products/', data);
export const updateProduct = (id: string, data: any) => api.put(`/commerce/products/${id}/`, data);
export const deleteProduct = (id: string) => api.delete(`/commerce/products/${id}/`);

// Categories
export const getCategories = () => api.get('/commerce/categories/');
export const getCategory = (id: string) => api.get(`/commerce/categories/${id}/`);

// Customers
export const getCustomers = () => api.get('/commerce/customers/');
export const getCustomerByPhone = (phone: string) => 
  api.get('/commerce/customers/by_phone/', { params: { phone } });
export const createCustomer = (data: any) => api.post('/commerce/customers/', data);

// Orders
export const getOrders = (params?: { store?: string }) => 
  api.get('/commerce/orders/', { params });
export const getOrder = (id: string) => api.get(`/commerce/orders/${id}/`);
export const createOrder = (data: any) => api.post('/commerce/orders/', data);

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
