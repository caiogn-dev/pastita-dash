import api from './api';
import {
  CompanyProfile,
  CreateCompanyProfile,
  UpdateCompanyProfile,
  AutoMessage,
  CreateAutoMessage,
  CustomerSession,
  AutomationLog,
  CompanyProfileStats,
  AutomationStats,
  PaginatedResponse,
  AutoMessageEventType,
} from '../types';

// Company Profile API
export const companyProfileService = {
  list: async (params?: {
    account_id?: string;
    store_slug?: string;
    business_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CompanyProfile>> => {
    const response = await api.get('/automation/companies/', { params });
    return response.data;
  },

  get: async (id: string): Promise<CompanyProfile> => {
    const response = await api.get(`/automation/companies/${id}/`);
    return response.data;
  },

  create: async (data: CreateCompanyProfile): Promise<CompanyProfile> => {
    const response = await api.post('/automation/companies/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCompanyProfile): Promise<CompanyProfile> => {
    const response = await api.put(`/automation/companies/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/automation/companies/${id}/`);
  },

  regenerateApiKey: async (id: string): Promise<{ api_key: string; message: string }> => {
    const response = await api.post(`/automation/companies/${id}/regenerate_api_key/`);
    return response.data;
  },

  regenerateWebhookSecret: async (id: string): Promise<{ webhook_secret: string; message: string }> => {
    const response = await api.post(`/automation/companies/${id}/regenerate_webhook_secret/`);
    return response.data;
  },

  getStats: async (id: string): Promise<CompanyProfileStats> => {
    const response = await api.get(`/automation/companies/${id}/stats/`);
    return response.data;
  },
};

// Auto Message API
export const autoMessageService = {
  list: async (params?: {
    company_id?: string;
    event_type?: AutoMessageEventType;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AutoMessage>> => {
    const response = await api.get('/automation/messages/', { params });
    return response.data;
  },

  get: async (id: string): Promise<AutoMessage> => {
    const response = await api.get(`/automation/messages/${id}/`);
    return response.data;
  },

  create: async (data: CreateAutoMessage): Promise<AutoMessage> => {
    const response = await api.post('/automation/messages/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<AutoMessage>): Promise<AutoMessage> => {
    const response = await api.put(`/automation/messages/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/automation/messages/${id}/`);
  },

  test: async (
    id: string,
    data: {
      phone_number: string;
      customer_name?: string;
      cart_total?: string;
      order_number?: string;
      send?: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    rendered_message: string;
    buttons?: Array<{ id: string; title: string }>;
    error?: string;
  }> => {
    const response = await api.post(`/automation/messages/${id}/test/`, data);
    return response.data;
  },

  bulkUpdate: async (
    updates: Array<{
      id: string;
      is_active?: boolean;
      priority?: number;
      message_text?: string;
      delay_seconds?: number;
    }>
  ): Promise<{ updated: number; errors: string[] }> => {
    const response = await api.post('/automation/messages/bulk_update/', { updates });
    return response.data;
  },
};

// Customer Session API
export const customerSessionService = {
  list: async (params?: {
    company_id?: string;
    status?: string;
    phone_number?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CustomerSession>> => {
    const response = await api.get('/automation/sessions/', { params });
    return response.data;
  },

  get: async (id: string): Promise<CustomerSession> => {
    const response = await api.get(`/automation/sessions/${id}/`);
    return response.data;
  },

  getByPhone: async (params: {
    phone_number: string;
    company_id?: string;
  }): Promise<CustomerSession[]> => {
    const response = await api.get('/automation/sessions/by_phone/', { params });
    return response.data;
  },

  sendNotification: async (
    id: string,
    data: {
      event_type: AutoMessageEventType;
      context?: Record<string, unknown>;
    }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/automation/sessions/${id}/send_notification/`, data);
    return response.data;
  },

  updateStatus: async (
    id: string,
    status: string
  ): Promise<CustomerSession> => {
    const response = await api.post(`/automation/sessions/${id}/update_status/`, { status });
    return response.data;
  },
};

// Automation Log API
export const automationLogService = {
  list: async (params?: {
    company_id?: string;
    action_type?: string;
    is_error?: boolean;
    phone_number?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AutomationLog>> => {
    const response = await api.get('/automation/logs/', { params });
    return response.data;
  },

  get: async (id: string): Promise<AutomationLog> => {
    const response = await api.get(`/automation/logs/${id}/`);
    return response.data;
  },

  getStats: async (params?: { company_id?: string }): Promise<AutomationStats> => {
    const response = await api.get('/automation/logs/stats/', { params });
    return response.data;
  },
};

// Event type labels for display
export const eventTypeLabels: Record<AutoMessageEventType, string> = {
  // Em frase, não em Title Case (26/10): é o nome que o dono lê na tela.
  // Conversa
  welcome: 'Boas-vindas',
  menu: 'Cardápio',
  business_hours: 'Horário de funcionamento',
  out_of_hours: 'Fora do horário',
  faq: 'Perguntas frequentes',
  // Carrinho
  cart_created: 'Carrinho criado',
  cart_abandoned: 'Carrinho abandonado',
  cart_reminder: 'Lembrete de carrinho',
  cart_reminder_30: 'Lembrete de carrinho (30 min)',
  cart_reminder_2h: 'Lembrete de carrinho (2 h)',
  cart_reminder_24h: 'Lembrete de carrinho (24 h)',
  // Pagamento
  pix_generated: 'PIX gerado',
  pix_reminder: 'Lembrete de PIX',
  pix_expired: 'PIX expirado',
  payment_reminder_1: 'Lembrete de pagamento (30 min)',
  payment_reminder_2: 'Lembrete de pagamento (2 h)',
  payment_confirmed: 'Pagamento confirmado',
  payment_failed: 'Pagamento recusado',
  // Pedido
  order_received: 'Pedido recebido',
  order_confirmed: 'Pedido confirmado',
  order_preparing: 'Pedido em preparo',
  order_ready: 'Pedido pronto',
  order_shipped: 'Pedido enviado',
  order_out_for_delivery: 'Saiu para entrega',
  order_delivered: 'Pedido entregue',
  order_cancelled: 'Pedido cancelado',
  // Avaliação e atendimento
  feedback_request: 'Pedido de avaliação',
  feedback_received: 'Avaliação recebida',
  human_handoff: 'Passou para atendente',
  human_assigned: 'Atendente assumiu',
  // Livre
  custom: 'Outro momento',
};

// Business type labels
export const businessTypeLabels: Record<string, string> = {
  restaurant: 'Restaurante',
  ecommerce: 'E-commerce',
  services: 'Serviços',
  retail: 'Varejo',
  healthcare: 'Saúde',
  education: 'Educação',
  other: 'Outro',
};

// Session status labels
export const sessionStatusLabels: Record<string, string> = {
  active: 'Ativa',
  cart_created: 'Carrinho Criado',
  cart_abandoned: 'Carrinho Abandonado',
  checkout: 'Em Checkout',
  payment_pending: 'Aguardando Pagamento',
  payment_confirmed: 'Pagamento Confirmado',
  order_placed: 'Pedido Realizado',
  completed: 'Concluída',
  expired: 'Expirada',
};

// Message variables available for templates
// Intent type labels
export const intentTypeLabels: Record<string, string> = {
  greeting: 'Saudação',
  price_check: 'Consulta de Preço',
  business_hours: 'Horário de Funcionamento',
  delivery_info: 'Informações de Entrega',
  menu_request: 'Solicitação de Cardápio',
  track_order: 'Rastrear Pedido',
  payment_status: 'Status de Pagamento',
  location: 'Localização/Endereço',
  contact: 'Contato',
  faq: 'Pergunta Frequente',
  create_order: 'Criar Pedido',
  cancel_order: 'Cancelar Pedido',
  modify_order: 'Modificar Pedido',
  confirm_payment: 'Confirmar Pagamento',
  request_pix: 'Solicitar PIX',
  add_to_cart: 'Adicionar ao Carrinho',
  product_inquiry: 'Consulta de Produto',
  customization: 'Personalização',
  comparison: 'Comparação',
  recommendation: 'Recomendação',
  complaint: 'Reclamação',
  general_question: 'Pergunta Geral',
  unknown: 'Desconhecido',
  human_handoff: 'Transferir para Humano',
};

// =============================================================================
// AGENT FLOW API - Flow Builder (Stub para build passar)
// =============================================================================

export interface AgentFlow {
  id: string;
  name: string;
  description: string;
  store: string;
  store_name?: string;
  store_slug?: string;
  flow_json: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  is_active: boolean;
  is_default: boolean;
  version: string;
  total_executions: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentFlow {
  name: string;
  description?: string;
  store: string;
  flow_json?: AgentFlow['flow_json'];
  is_active?: boolean;
  is_default?: boolean;
  version?: string;
}

export interface UpdateAgentFlow {
  name?: string;
  description?: string;
  flow_json?: AgentFlow['flow_json'];
  is_active?: boolean;
  is_default?: boolean;
  version?: string;
}

export const agentFlowService = {
  list: async (params?: {
    store_id?: string;
    store_slug?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<AgentFlow>> => {
    const response = await api.get('/automation/flows/', { params });
    return response.data;
  },

  get: async (id: string): Promise<AgentFlow> => {
    const response = await api.get(`/automation/flows/${id}/`);
    return response.data;
  },

  create: async (data: CreateAgentFlow): Promise<AgentFlow> => {
    const response = await api.post('/automation/flows/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAgentFlow): Promise<AgentFlow> => {
    const response = await api.patch(`/automation/flows/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/automation/flows/${id}/`);
  },

  duplicate: async (id: string): Promise<AgentFlow> => {
    const response = await api.post(`/automation/flows/${id}/duplicate/`);
    return response.data;
  },

  setDefault: async (id: string): Promise<{ status: string }> => {
    const response = await api.post(`/automation/flows/${id}/set_default/`);
    return response.data;
  },
};
