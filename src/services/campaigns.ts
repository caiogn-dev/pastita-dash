import api, { normalizePaginatedResponse } from './api';

export interface Campaign {
  id: string;
  account: string;
  name: string;
  description: string;
  campaign_type: 'broadcast' | 'drip' | 'triggered' | 'promotional' | 'transactional';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  template: string | null;
  message_content: Record<string, unknown>;
  audience_type: string;
  audience_filters: Record<string, unknown>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  messages_per_minute: number;
  // Serializer expõe como `delay_between_seconds` (source='delay_between_messages').
  delay_between_seconds: number;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  /** Quantos pediram para sair por causa desta campanha. Ausente em registro
   *  gravado antes de 28/ago/2026 — sempre leia com `?? 0`. */
  messages_opted_out?: number;
  delivery_rate: number;
  read_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  phone_number: string;
  contact_name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_code: string;
  error_message: string;
  variables: Record<string, unknown>;
}

export interface ContactList {
  id: string;
  account: string;
  name: string;
  description: string;
  contacts: Array<{ phone: string; name?: string; variables?: Record<string, unknown> }>;
  contact_count: number;
  source: string;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemContact {
  phone: string;
  name: string;
  source?: 'conversation' | 'order' | 'subscriber' | 'session';
  /** Como o backend classifica a última compra. Ausente em resposta antiga. */
  recencia?: Recencia;
  frequencia?: Frequencia | null;
  pedidos?: number;
  ticket_medio?: number;
  ultima_compra?: string | null;
}

export type Recencia = 'ativo' | 'em_risco' | 'inativo' | 'nunca_comprou';
export type Frequencia = 'novo' | 'ocasional' | 'vip';

/** Os filtros de audiência. Tudo opcional: vazio significa "todos". */
export interface FiltrosDeAudiencia {
  recencia?: Recencia[];
  frequencia?: Frequencia[];
  produtos?: string[];
  bairros?: string[];
  ticket_min?: number;
  ticket_max?: number;
}

export interface ResumoDeSegmento {
  valor: string;
  rotulo: string;
  total: number;
}

export interface RespostaDeAudiencia {
  count: number;
  /** Total que passou no filtro, ANTES do corte por `limit`. */
  total: number;
  total_sem_filtro: number;
  excluidos_por_optout: number;
  /** Frase em português dizendo quem vai receber. */
  descricao: string;
  resumo: { recencia: ResumoDeSegmento[]; frequencia: ResumoDeSegmento[] };
  results: SystemContact[];
}

export interface OpcoesDeAudiencia {
  recencia: { valor: Recencia; rotulo: string }[];
  frequencia: { valor: Frequencia; rotulo: string }[];
  bairros: { nome: string; clientes: number }[];
  produtos: { id: string; nome: string }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const campaignsService = {
  // Campaigns (WhatsApp) - usando /campaigns/ endpoint
  getCampaigns: async (params?: Record<string, string>): Promise<PaginatedResponse<Campaign>> => {
    const response = await api.get<PaginatedResponse<Campaign>>('/campaigns/campaigns/', { params });
    return response.data;
  },

  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.get<Campaign>(`/campaigns/campaigns/${id}/`);
    return response.data;
  },

  createCampaign: async (data: {
    account_id: string;
    name: string;
    description?: string;
    campaign_type?: string;
    template_id?: string;
    message_content?: Record<string, unknown>;
    audience_filters?: Record<string, unknown>;
    contact_list?: Array<{ phone: string; name?: string; variables?: Record<string, unknown> }>;
    scheduled_at?: string;
    messages_per_minute?: number;
    delay_between_seconds?: number;
  }): Promise<Campaign> => {
    const response = await api.post<Campaign>('/campaigns/campaigns/', data);
    return response.data;
  },

  uploadCampaignMedia: async (file: File): Promise<{
    media_url: string;
    media_type: 'image' | 'document';
    filename: string;
    mime_type: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/campaigns/campaigns/upload-media/', formData);
    return response.data;
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.patch<Campaign>(`/campaigns/campaigns/${id}/`, data);
    return response.data;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/campaigns/${id}/`);
  },

  scheduleCampaign: async (id: string, scheduledAt: string): Promise<Campaign> => {
    const response = await api.post<Campaign>(`/campaigns/campaigns/${id}/schedule/`, {
      scheduled_at: scheduledAt,
    });
    return response.data;
  },

  startCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.post<Campaign>(`/campaigns/campaigns/${id}/start/`);
    return response.data;
  },

  pauseCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.post<Campaign>(`/campaigns/campaigns/${id}/pause/`);
    return response.data;
  },

  resumeCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.post<Campaign>(`/campaigns/campaigns/${id}/resume/`);
    return response.data;
  },

  cancelCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.post<Campaign>(`/campaigns/campaigns/${id}/cancel/`);
    return response.data;
  },

  getCampaignStats: async (id: string): Promise<{
    id: string;
    name: string;
    status: string;
    total_recipients: number;
    messages_sent: number;
    messages_delivered: number;
    messages_read: number;
    messages_failed: number;
    delivery_rate: number;
    read_rate: number;
    pending: number;
    started_at: string | null;
    completed_at: string | null;
  }> => {
    const response = await api.get(`/campaigns/campaigns/${id}/stats/`);
    return response.data;
  },

  getCampaignRecipients: async (id: string, status?: string): Promise<CampaignRecipient[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const response = await api.get(`/campaigns/campaigns/${id}/recipients/`, { params });
    // O endpoint pagina (envelope {count,results}). Antes retornava o objeto cru
    // como se fosse array → recipients.length = undefined ("Processando: undefined").
    return normalizePaginatedResponse<CampaignRecipient>(response.data);
  },

  addRecipients: async (
    id: string,
    contacts: Array<{ phone: string; name?: string; variables?: Record<string, unknown> }>
  ): Promise<{ added: number }> => {
    const response = await api.post(`/campaigns/campaigns/${id}/add_recipients/`, { contacts });
    return response.data;
  },

  // Contact Lists (WhatsApp) - usando /campaigns/contacts/ endpoint
  getContactLists: async (params?: Record<string, string>): Promise<PaginatedResponse<ContactList>> => {
    const response = await api.get<PaginatedResponse<ContactList>>('/campaigns/contacts/', { params });
    return response.data;
  },

  getContactList: async (id: string): Promise<ContactList> => {
    const response = await api.get<ContactList>(`/campaigns/contacts/${id}/`);
    return response.data;
  },

  createContactList: async (data: {
    account_id: string;
    name: string;
    description?: string;
    contacts?: Array<{ phone: string; name?: string; variables?: Record<string, unknown> }>;
  }): Promise<ContactList> => {
    const response = await api.post<ContactList>('/campaigns/contacts/', data);
    return response.data;
  },

  updateContactList: async (id: string, data: Partial<ContactList>): Promise<ContactList> => {
    const response = await api.patch<ContactList>(`/campaigns/contacts/${id}/`, data);
    return response.data;
  },

  deleteContactList: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/contacts/${id}/`);
  },

  importContactsFromCSV: async (data: {
    account_id: string;
    name: string;
    csv_content: string;
  }): Promise<ContactList> => {
    const response = await api.post<ContactList>('/campaigns/contacts/import_csv/', data);
    return response.data;
  },

  getSystemContacts: async (params?: {
    account_id?: string;
    /** Slug da loja. SEM ele o backend cai nas lojas da conta — e o dono
     *  enxerga doze lojas, então mandar sempre é o que mantém o segmento
     *  falando da loja certa. */
    store?: string;
    source?: 'all' | 'conversations' | 'orders' | 'subscribers' | 'sessions';
    limit?: number;
  } & FiltrosDeAudiencia): Promise<RespostaDeAudiencia> => {
    // Arrays viram lista separada por vírgula: o backend aceita os dois
    // formatos, e um só valor por chave mantém a URL legível no log.
    const query: Record<string, string | number> = {};
    Object.entries(params ?? {}).forEach(([chave, valor]) => {
      if (valor === undefined || valor === null || valor === '') return;
      if (Array.isArray(valor)) {
        if (valor.length) query[chave] = valor.join(',');
        return;
      }
      query[chave] = valor as string | number;
    });

    const response = await api.get('/campaigns/system-contacts/', { params: query });
    const data = response.data ?? {};

    // Backend antigo devolve só `count` e `results`. Sem estes defaults a tela
    // quebraria no primeiro `.length` de um campo que ainda não existe.
    return {
      count: data.count ?? 0,
      total: data.total ?? data.count ?? 0,
      total_sem_filtro: data.total_sem_filtro ?? data.count ?? 0,
      excluidos_por_optout: data.excluidos_por_optout ?? 0,
      descricao: data.descricao ?? 'Todos os contatos',
      resumo: data.resumo ?? { recencia: [], frequencia: [] },
      results: data.results ?? [],
    };
  },

  getOpcoesDeAudiencia: async (params?: {
    store?: string;
    account_id?: string;
  }): Promise<OpcoesDeAudiencia> => {
    const response = await api.get('/campaigns/audiencia/opcoes/', { params });
    const data = response.data ?? {};
    return {
      recencia: data.recencia ?? [],
      frequencia: data.frequencia ?? [],
      bairros: data.bairros ?? [],
      produtos: data.produtos ?? [],
    };
  },
};

// NOTE: Scheduled messages moved to automation service
// Use automation.scheduledMessagesService for scheduled message operations
