import api from './api';
import { ExportParams } from '../types';
import { getStoreSlugWithFallback } from '../hooks/useStore';

export const exportService = {
  exportMessages: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get('/core/export/messages/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportOrders: async (params: ExportParams = {}): Promise<Blob> => {
    const storeSlug = getStoreSlugWithFallback();
    const store = params.store || storeSlug || undefined;
    // ATUALIZADO: Usando /stores/reports/orders/export/ (backend migrado - 2026-03-04)
    const response = await api.get('/stores/reports/orders/export/', {
      params: { ...params, store },
      responseType: 'blob',
    });
    return response.data;
  },

  exportSessions: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get('/core/export/sessions/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportAutomationLogs: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get('/core/export/automation-logs/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportConversations: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get('/core/export/conversations/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  downloadBlob: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default exportService;
