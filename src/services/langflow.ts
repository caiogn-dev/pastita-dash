import api from './api';
import type { LangflowFlow, LangflowSession, LangflowLog } from '../types';

// Re-export types for backwards compatibility
export type { LangflowFlow, LangflowSession, LangflowLog };

// Extended types for new functionality
export interface Flow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error' | 'draft' | 'inactive' | 'testing';
  type?: 'chat' | 'automation' | 'classification' | 'generation';
  created_at: string;
  updated_at: string;
  node_count?: number;
  execution_count?: number;
  avg_response_time?: number;
  last_executed_at?: string;
  is_default?: boolean;
  config?: Record<string, unknown>;
  flow_id?: string;
  endpoint_url?: string;
  timeout_seconds?: number;
}

export interface FlowExecution {
  id: string;
  flow_id: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'success' | 'error';
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
}

export interface Integration {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram' | 'webhook' | 'api';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
  last_used_at?: string;
}

export interface FlowStats {
  totalFlows: number;
  activeFlows: number;
  totalExecutions: number;
  avgResponseTime: number;
  successRate: number;
}

export interface CreateFlowData {
  name: string;
  description?: string;
  type?: Flow['type'];
  flow_id?: string;
  endpoint_url?: string;
  status?: string;
  timeout_seconds?: number;
  config?: Record<string, unknown>;
}

export interface UpdateFlowData {
  name?: string;
  description?: string;
  status?: string;
  config?: Record<string, unknown>;
  flow_id?: string;
  endpoint_url?: string;
  timeout_seconds?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProcessMessageRequest {
  flow_id: string;
  message: string;
  session_id?: string;
  context?: Record<string, unknown>;
}

export interface ProcessMessageResponse {
  response: string;
  session_id: string;
  metadata?: Record<string, unknown>;
}

const langflowService = {
  // Flows
  getFlows: async (): Promise<PaginatedResponse<LangflowFlow>> => {
    try {
      const response = await api.get<PaginatedResponse<LangflowFlow>>('/langflow/flows/');
      return response.data;
    } catch {
      // Return empty response if endpoint doesn't exist
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  getFlow: async (id: string): Promise<LangflowFlow> => {
    const response = await api.get<LangflowFlow>(`/langflow/flows/${id}/`);
    return response.data;
  },

  createFlow: async (data: CreateFlowData): Promise<LangflowFlow> => {
    const response = await api.post<LangflowFlow>('/langflow/flows/', data);
    return response.data;
  },

  updateFlow: async (id: string, data: UpdateFlowData): Promise<LangflowFlow> => {
    const response = await api.patch<LangflowFlow>(`/langflow/flows/${id}/`, data);
    return response.data;
  },

  deleteFlow: async (id: string): Promise<void> => {
    await api.delete(`/langflow/flows/${id}/`);
  },

  // Flow Stats
  getFlowStats: async (id: string): Promise<{
    total_executions: number;
    success_rate: number;
    avg_duration_ms: number;
    last_24h: { executions: number; successes: number };
  }> => {
    const response = await api.get(`/langflow/flows/${id}/stats/`);
    return response.data;
  },

  // Flow Logs
  getFlowLogs: async (id: string, limit = 50): Promise<LangflowLog[]> => {
    const response = await api.get(`/langflow/flows/${id}/logs/`, {
      params: { limit },
    });
    return response.data.results || response.data;
  },

  // Sessions
  getSessions: async (): Promise<PaginatedResponse<LangflowSession>> => {
    try {
      const response = await api.get<PaginatedResponse<LangflowSession>>('/langflow/sessions/');
      return response.data;
    } catch {
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  getSession: async (id: string): Promise<LangflowSession> => {
    const response = await api.get<LangflowSession>(`/langflow/sessions/${id}/`);
    return response.data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/langflow/sessions/${id}/`);
  },

  // Process Message (Playground)
  processMessage: async (data: ProcessMessageRequest): Promise<ProcessMessageResponse> => {
    const response = await api.post<ProcessMessageResponse>('/langflow/process/', data);
    return response.data;
  },

  // Flow Executions
  executeFlow: async (flowId: string, input: Record<string, unknown>): Promise<{ output: Record<string, unknown> }> => {
    const response = await api.post(`/langflow/flows/${flowId}/execute/`, { input });
    return response.data;
  },

  getExecutions: async (flowId?: string, limit = 50): Promise<FlowExecution[]> => {
    try {
      const params: Record<string, string> = { limit: limit.toString() };
      if (flowId) params.flow_id = flowId;
      const response = await api.get('/langflow/executions/', { params });
      return response.data.results || response.data;
    } catch {
      return [];
    }
  },

  getExecution: async (id: string): Promise<FlowExecution> => {
    const response = await api.get(`/langflow/executions/${id}/`);
    return response.data;
  },

  // Integrations
  getIntegrations: async (): Promise<Integration[]> => {
    try {
      const response = await api.get('/langflow/integrations/');
      return response.data.results || response.data;
    } catch {
      return [];
    }
  },

  createIntegration: async (data: Omit<Integration, 'id'>): Promise<Integration> => {
    const response = await api.post('/langflow/integrations/', data);
    return response.data;
  },

  updateIntegration: async (id: string, data: Partial<Integration>): Promise<Integration> => {
    const response = await api.patch(`/langflow/integrations/${id}/`, data);
    return response.data;
  },

  deleteIntegration: async (id: string): Promise<void> => {
    await api.delete(`/langflow/integrations/${id}/`);
  },

  testIntegration: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/langflow/integrations/${id}/test/`);
    return response.data;
  },

  // Stats
  getStats: async (): Promise<FlowStats> => {
    try {
      const response = await api.get('/langflow/stats/');
      return response.data;
    } catch {
      return {
        totalFlows: 0,
        activeFlows: 0,
        totalExecutions: 0,
        avgResponseTime: 0,
        successRate: 0,
      };
    }
  },

  // AI Features
  generateResponse: async (message: string, context?: string[]): Promise<{ response: string }> => {
    const response = await api.post('/langflow/generate/', {
      message,
      context,
    });
    return response.data;
  },

  classifyIntent: async (message: string): Promise<{ intent: string; confidence: number }> => {
    const response = await api.post('/langflow/classify/', { message });
    return response.data;
  },

  // Templates
  getTemplates: async (): Promise<Array<{ id: string; name: string; description: string; category: string }>> => {
    try {
      const response = await api.get('/langflow/templates/');
      return response.data.results || response.data;
    } catch {
      return [];
    }
  },

  applyTemplate: async (templateId: string, customizations: Record<string, unknown>): Promise<Flow> => {
    const response = await api.post(`/langflow/templates/${templateId}/apply/`, customizations);
    return response.data;
  },
};

export default langflowService;
