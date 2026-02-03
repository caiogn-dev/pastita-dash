import api from './api';

export interface Agent {
  id: string;
  name: string;
  description: string;
  provider: 'kimi' | 'openai' | 'anthropic' | 'ollama';
  model_name: string;
  status: 'active' | 'inactive' | 'draft';
  temperature: number;
  max_tokens: number;
  use_memory: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentDetail extends Agent {
  base_url: string;
  timeout: number;
  system_prompt: string;
  context_prompt: string;
  memory_ttl: number;
  accounts: Array<{
    id: string;
    name: string;
    phone_number: string;
  }>;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  provider: Agent['provider'];
  model_name: string;
  api_key: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
  system_prompt?: string;
  context_prompt?: string;
  status?: Agent['status'];
  use_memory?: boolean;
  memory_ttl?: number;
  accounts?: string[];
}

export interface ProcessMessageRequest {
  message: string;
  session_id?: string;
  phone_number?: string;
  context?: Record<string, unknown>;
}

export interface ProcessMessageResponse {
  response: string;
  session_id: string;
  tokens_used?: number;
  response_time_ms?: number;
}

export interface AgentStats {
  total_conversations: number;
  total_messages: number;
  avg_response_time_ms: number;
  active_sessions: number;
}

export interface AgentConversation {
  id: string;
  session_id: string;
  phone_number: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  messages?: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  created_at: string;
}

const agentsService = {
  // Agents
  getAgents: async (): Promise<Agent[]> => {
    const response = await api.get('/agents/agents/');
    return response.data.results || response.data;
  },

  getAgent: async (id: string): Promise<AgentDetail> => {
    const response = await api.get(`/agents/agents/${id}/`);
    return response.data;
  },

  createAgent: async (data: CreateAgentData): Promise<Agent> => {
    const response = await api.post('/agents/agents/', data);
    return response.data;
  },

  updateAgent: async (id: string, data: Partial<CreateAgentData>): Promise<Agent> => {
    const response = await api.patch(`/agents/agents/${id}/`, data);
    return response.data;
  },

  deleteAgent: async (id: string): Promise<void> => {
    await api.delete(`/agents/agents/${id}/`);
  },

  // Process messages
  processMessage: async (
    agentId: string,
    data: ProcessMessageRequest
  ): Promise<ProcessMessageResponse> => {
    const response = await api.post(`/agents/agents/${agentId}/process/`, data);
    return response.data;
  },

  // Stats
  getAgentStats: async (agentId: string): Promise<AgentStats> => {
    const response = await api.get(`/agents/agents/${agentId}/stats/`);
    return response.data;
  },

  // Conversations
  getAgentConversations: async (agentId: string): Promise<AgentConversation[]> => {
    const response = await api.get(`/agents/agents/${agentId}/conversations/`);
    return response.data.results || response.data;
  },

  getConversation: async (sessionId: string): Promise<AgentConversation> => {
    const response = await api.get(`/agents/conversations/${sessionId}/`);
    return response.data;
  },

  getConversationHistory: async (sessionId: string): Promise<AgentMessage[]> => {
    const response = await api.get(`/agents/conversations/${sessionId}/history/`);
    return response.data;
  },

  clearConversationMemory: async (sessionId: string): Promise<boolean> => {
    const response = await api.post(`/agents/conversations/${sessionId}/clear_memory/`);
    return response.data.success;
  },
};

export default agentsService;
