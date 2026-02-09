import api from './api';

export type HandoverStatus = 'bot' | 'human' | 'pending' | 'expired';
export type HandoverRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface HandoverStatus {
  status: HandoverStatus;
  requested_by?: string;
  requested_by_name?: string;
  requested_at?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  expires_at?: string;
  reason?: string;
  notes?: string;
}

export interface HandoverRequest {
  id: string;
  conversation: string;
  requested_by: string;
  requested_by_name: string;
  status: HandoverRequestStatus;
  reason?: string;
  requested_at: string;
  responded_by?: string;
  responded_by_name?: string;
  responded_at?: string;
  expires_at?: string;
}

export interface HandoverHistory {
  id: string;
  conversation: string;
  action: 'request' | 'approve' | 'reject' | 'to_human' | 'to_bot' | 'extend' | 'force_return';
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
  details?: Record<string, any>;
}

export interface HumanAgent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  is_online: boolean;
  active_conversations_count: number;
  status: 'available' | 'busy' | 'offline';
}

export interface HandoverConfig {
  auto_expiry_minutes: number;
  require_approval: boolean;
  notify_agents: boolean;
  business_hours_only: boolean;
  max_conversations_per_agent: number;
  escalation_rules: Array<{
    condition: string;
    action: string;
    target?: string;
  }>;
}

export const handoverService = {
  // Get current handover status for a conversation
  getStatus: (conversationId: string) =>
    api.get<HandoverStatus>(`/conversations/${conversationId}/handover/status/`),
  
  // Request handover to human agent
  requestHandover: (conversationId: string, data: {
    reason?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
  }) => api.post<HandoverRequest>(`/conversations/${conversationId}/handover/request/`, data),
  
  // Approve a handover request
  approveRequest: (conversationId: string, requestId: string, data?: {
    agent_id?: string;
    notes?: string;
    expiry_minutes?: number;
  }) => api.post<HandoverStatus>(`/conversations/${conversationId}/handover/approve/`, {
    request_id: requestId,
    ...data,
  }),
  
  // Reject a handover request
  rejectRequest: (conversationId: string, requestId: string, data?: {
    reason?: string;
  }) => api.post(`/conversations/${conversationId}/handover/reject/`, {
    request_id: requestId,
    ...data,
  }),
  
  // Transfer conversation to human agent (direct)
  transferToHuman: (conversationId: string, data?: {
    agent_id?: string;
    reason?: string;
    expiry_minutes?: number;
  }) => api.post<HandoverStatus>(`/conversations/${conversationId}/handover/to-human/`, data),
  
  // Return conversation to bot
  transferToBot: (conversationId: string, data?: {
    reason?: string;
    summary?: string;
  }) => api.post<HandoverStatus>(`/conversations/${conversationId}/handover/to-bot/`, data),
  
  // Extend handover expiry time
  extendHandover: (conversationId: string, data: {
    additional_minutes: number;
    reason?: string;
  }) => api.post<HandoverStatus>(`/conversations/${conversationId}/handover/extend/`, data),
  
  // Force return to bot (admin only)
  forceReturnToBot: (conversationId: string, data?: {
    reason?: string;
    notify_agent?: boolean;
  }) => api.post<HandoverStatus>(`/conversations/${conversationId}/handover/force-return/`, data),
  
  // Get pending handover requests
  getPendingRequests: (params?: { store?: string; platform?: string }) =>
    api.get<HandoverRequest[]>('/conversations/handover/requests/pending/', { params }),
  
  // Get handover history for a conversation
  getHistory: (conversationId: string) =>
    api.get<HandoverHistory[]>(`/conversations/${conversationId}/handover/history/`),
  
  // Get active human-handled conversations
  getActiveHumanConversations: (params?: { 
    agent_id?: string; 
    store?: string; 
    platform?: string;
  }) => api.get('/conversations/handover/active/', { params }),
  
  // Get available human agents
  getAvailableAgents: (storeId?: string) =>
    api.get<HumanAgent[]>('/conversations/handover/agents/available/', {
      params: storeId ? { store: storeId } : undefined,
    }),
  
  // Get all human agents
  getAgents: (params?: { store?: string; is_active?: boolean }) =>
    api.get<HumanAgent[]>('/conversations/handover/agents/', { params }),
  
  // Assign agent to conversation
  assignAgent: (conversationId: string, agentId: string) =>
    api.post(`/conversations/${conversationId}/handover/assign/`, { agent_id: agentId }),
  
  // Unassign agent from conversation
  unassignAgent: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/handover/unassign/`),
  
  // Get handover configuration
  getConfig: (storeId: string) =>
    api.get<HandoverConfig>(`/stores/${storeId}/handover/config/`),
  
  // Update handover configuration
  updateConfig: (storeId: string, data: Partial<HandoverConfig>) =>
    api.patch<HandoverConfig>(`/stores/${storeId}/handover/config/`, data),
  
  // Get handover metrics/stats
  getStats: (params?: { 
    store?: string; 
    since?: string; 
    until?: string;
    group_by?: 'day' | 'week' | 'month';
  }) => api.get('/conversations/handover/stats/', { params }),
  
  // Mark conversation as resolved (by human)
  markResolved: (conversationId: string, data?: {
    resolution?: string;
    tags?: string[];
  }) => api.post(`/conversations/${conversationId}/handover/resolve/`, data),
  
  // Take over conversation (for human agents)
  takeOver: (conversationId: string) =>
    api.post<HandoverStatus>(`/conversations/${conversationId}/handover/take-over/`),
  
  // Typing indicator for human agents
  sendTypingIndicator: (conversationId: string, isTyping: boolean) =>
    api.post(`/conversations/${conversationId}/handover/typing/`, { is_typing: isTyping }),
};

export default handoverService;
