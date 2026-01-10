import api from './api';
import { ExportParams } from '../types';

const BASE_URL = '/api/v1';

export const exportService = {
  exportMessages: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/messages/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportOrders: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/orders/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportSessions: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/sessions/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportAutomationLogs: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/automation-logs/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportConversations: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/conversations/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportPayments: async (params: ExportParams = {}): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/payments/`, {
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
