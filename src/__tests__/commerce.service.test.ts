/**
 * Unit tests for src/services/commerce.ts
 */

import {
  getStores,
  getStore,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getOrders,
  getOrder,
  createOrder,
} from '../services/commerce';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../services/api';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPut = (api as any).put as jest.Mock;
const mockDelete = (api as any).delete as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('commerce service', () => {
  describe('stores', () => {
    it('getStores calls GET /stores/', () => {
      getStores();
      expect(mockGet).toHaveBeenCalledWith('/stores/');
    });

    it('getStore calls GET /stores/{slug}/', () => {
      getStore('my-store');
      expect(mockGet).toHaveBeenCalledWith('/stores/my-store/');
    });
  });

  describe('products', () => {
    it('getProducts calls GET /stores/products/', () => {
      getProducts();
      expect(mockGet).toHaveBeenCalledWith('/stores/products/', { params: undefined });
    });

    it('getProducts passes store filter', () => {
      getProducts({ store: 'abc-store' });
      expect(mockGet).toHaveBeenCalledWith('/stores/products/', {
        params: { store: 'abc-store' },
      });
    });

    it('getProduct calls GET /stores/products/{id}/', () => {
      getProduct('prod-123');
      expect(mockGet).toHaveBeenCalledWith('/stores/products/prod-123/');
    });

    it('createProduct posts to /stores/products/', () => {
      const payload = { name: 'Salada Caesar', price: 29.9 };
      createProduct(payload);
      expect(mockPost).toHaveBeenCalledWith('/stores/products/', payload);
    });

    it('updateProduct puts to /stores/products/{id}/', () => {
      const payload = { name: 'Updated Salad', price: 35 };
      updateProduct('prod-123', payload);
      expect(mockPut).toHaveBeenCalledWith('/stores/products/prod-123/', payload);
    });

    it('deleteProduct calls DELETE /stores/products/{id}/', () => {
      deleteProduct('prod-123');
      expect(mockDelete).toHaveBeenCalledWith('/stores/products/prod-123/');
    });
  });

  describe('categories', () => {
    it('getCategories calls GET /stores/categories/', () => {
      getCategories();
      expect(mockGet).toHaveBeenCalledWith('/stores/categories/');
    });
  });

  describe('orders', () => {
    it('getOrders calls GET /stores/orders/', () => {
      getOrders();
      expect(mockGet).toHaveBeenCalledWith('/stores/orders/', { params: undefined });
    });

    it('getOrders passes store filter', () => {
      getOrders({ store: 'abc' });
      expect(mockGet).toHaveBeenCalledWith('/stores/orders/', { params: { store: 'abc' } });
    });

    it('getOrder calls GET /stores/orders/{id}/', () => {
      getOrder('order-uuid');
      expect(mockGet).toHaveBeenCalledWith('/stores/orders/order-uuid/');
    });

    it('createOrder posts to /stores/orders/', () => {
      const payload = { customer_name: 'Maria', items: [] };
      createOrder(payload);
      expect(mockPost).toHaveBeenCalledWith('/stores/orders/', payload);
    });
  });
});
