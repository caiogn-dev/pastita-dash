import api from './api';
import {
  LangflowFlow,
  LangflowSession,
  LangflowLog,
  ProcessMessageRequest,
  ProcessMessageResponse,
  PaginatedResponse,
} from '../types';

export const langflowService = {
  // Flows
  getFlows: async (params?: Record<string, string>): Promise<PaginatedResponse<LangflowFlow>> => {
    const response = await api.get<PaginatedResponse<LangflowFlow>>('/langflow/flows/', { params });
    return response.data;
  },

  getFlow: async (id: string): Promise<LangflowFlow> => {
    const response = await api.get<LangflowFlow>(`/langflow/flows/${id}/`);
    return response.data;
  },

  createFlow: async (data: {
    name: string;
    description?: string;
    flow_id: string;
    endpoint_url?: string;
    status?: string;
    input_type?: string;
    output_type?: string;
    tweaks?: Record<string, unknown>;
    default_context?: Record<string, unknown>;
    timeout_seconds?: number;
    max_retries?: number;
  }): Promise<LangflowFlow> => {
    const response = await api.post<LangflowFlow>('/langflow/flows/', data);
    return response.data;
  },

  updateFlow: async (id: string, data: Partial<LangflowFlow>): Promise<LangflowFlow> => {
    const response = await api.patch<LangflowFlow>(`/langflow/flows/${id}/`, data);
    return response.data;
  },

  deleteFlow: async (id: string): Promise<void> => {
    await api.delete(`/langflow/flows/${id}/`);
  },

  processMessage: async (data: ProcessMessageRequest): Promise<ProcessMessageResponse> => {
    const response = await api.post<ProcessMessageResponse>('/langflow/flows/process/', data);
    return response.data;
  },

  assignAccounts: async (id: string, accountIds: string[]): Promise<LangflowFlow> => {
    const response = await api.post<LangflowFlow>(`/langflow/flows/${id}/assign_accounts/`, {
      account_ids: accountIds,
    });
    return response.data;
  },

  removeAccounts: async (id: string, accountIds: string[]): Promise<LangflowFlow> => {
    const response = await api.post<LangflowFlow>(`/langflow/flows/${id}/remove_accounts/`, {
      account_ids: accountIds,
    });
    return response.data;
  },

  getFlowStats: async (id: string): Promise<{
    flow_id: string;
    flow_name: string;
    total_interactions: number;
    avg_duration_ms: number;
    by_status: Record<string, number>;
    active_sessions: number;
  }> => {
    const response = await api.get(`/langflow/flows/${id}/stats/`);
    return response.data;
  },

  getFlowLogs: async (id: string): Promise<LangflowLog[]> => {
    const response = await api.get<LangflowLog[]>(`/langflow/flows/${id}/logs/`);
    return response.data;
  },

  // Sessions
  getSessions: async (params?: Record<string, string>): Promise<PaginatedResponse<LangflowSession>> => {
    const response = await api.get<PaginatedResponse<LangflowSession>>('/langflow/sessions/', { params });
    return response.data;
  },

  getSession: async (id: string): Promise<LangflowSession> => {
    const response = await api.get<LangflowSession>(`/langflow/sessions/${id}/`);
    return response.data;
  },

  getSessionHistory: async (id: string): Promise<Array<{ role: string; content: string }>> => {
    const response = await api.get(`/langflow/sessions/${id}/history/`);
    return response.data;
  },

  updateSessionContext: async (id: string, context: Record<string, unknown>): Promise<LangflowSession> => {
    const response = await api.post<LangflowSession>(`/langflow/sessions/${id}/update_context/`, {
      context,
    });
    return response.data;
  },

  clearSessionHistory: async (id: string): Promise<LangflowSession> => {
    const response = await api.post<LangflowSession>(`/langflow/sessions/${id}/clear_history/`);
    return response.data;
  },
};
