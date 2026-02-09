import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handoverService, HandoverStatus, HandoverRequest, HandoverHistory, HumanAgent, HandoverConfig } from '../services/handover';
import toast from 'react-hot-toast';

// Query keys
const HANDOVER_KEYS = {
  status: (conversationId: string) => ['handover', 'status', conversationId] as const,
  history: (conversationId: string) => ['handover', 'history', conversationId] as const,
  pendingRequests: (params?: Record<string, any>) => ['handover', 'requests', 'pending', params] as const,
  activeConversations: (params?: Record<string, any>) => ['handover', 'conversations', 'active', params] as const,
  availableAgents: (storeId?: string) => ['handover', 'agents', 'available', storeId] as const,
  agents: (params?: Record<string, any>) => ['handover', 'agents', params] as const,
  config: (storeId: string) => ['handover', 'config', storeId] as const,
  stats: (params?: Record<string, any>) => ['handover', 'stats', params] as const,
};

// ============================================
// STATUS
// ============================================

export const useHandoverStatus = (conversationId: string) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.status(conversationId),
    queryFn: () => handoverService.getStatus(conversationId),
    select: (res) => res.data,
    enabled: !!conversationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// ============================================
// HANDOVER REQUESTS
// ============================================

export const useRequestHandover = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: Parameters<typeof handoverService.requestHandover>[1];
    }) => handoverService.requestHandover(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.pendingRequests() });
      toast.success('Solicitação enviada! Aguardando aprovação...');
    },
    onError: () => toast.error('Erro ao solicitar handover'),
  });
};

export const useApproveHandoverRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      requestId,
      data,
    }: {
      conversationId: string;
      requestId: string;
      data?: Parameters<typeof handoverService.approveRequest>[2];
    }) => handoverService.approveRequest(conversationId, requestId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Handover aprovado!');
    },
    onError: () => toast.error('Erro ao aprovar'),
  });
};

export const useRejectHandoverRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      requestId,
      data,
    }: {
      conversationId: string;
      requestId: string;
      data?: Parameters<typeof handoverService.rejectRequest>[2];
    }) => handoverService.rejectRequest(conversationId, requestId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.pendingRequests() });
      toast.success('Solicitação rejeitada');
    },
    onError: () => toast.error('Erro ao rejeitar'),
  });
};

// ============================================
// TRANSFER OPERATIONS
// ============================================

export const useTransferToHuman = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data?: Parameters<typeof handoverService.transferToHuman>[1];
    }) => handoverService.transferToHuman(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Conversa transferida para atendente humano!');
    },
    onError: () => toast.error('Erro ao transferir'),
  });
};

export const useTransferToBot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data?: Parameters<typeof handoverService.transferToBot>[1];
    }) => handoverService.transferToBot(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Conversa retornada para o bot!');
    },
    onError: () => toast.error('Erro ao retornar para bot'),
  });
};

export const useExtendHandover = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: Parameters<typeof handoverService.extendHandover>[1];
    }) => handoverService.extendHandover(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      toast.success('Tempo estendido!');
    },
    onError: () => toast.error('Erro ao estender'),
  });
};

export const useForceReturnToBot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data?: Parameters<typeof handoverService.forceReturnToBot>[1];
    }) => handoverService.forceReturnToBot(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Retornado ao bot forçadamente!');
    },
    onError: () => toast.error('Erro ao forçar retorno'),
  });
};

// ============================================
// PENDING REQUESTS
// ============================================

export const usePendingHandoverRequests = (params?: { store?: string; platform?: string }) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.pendingRequests(params),
    queryFn: () => handoverService.getPendingRequests(params),
    select: (res) => res.data,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
};

// ============================================
// ACTIVE CONVERSATIONS
// ============================================

export const useActiveHumanConversations = (params?: { agent_id?: string; store?: string; platform?: string }) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.activeConversations(params),
    queryFn: () => handoverService.getActiveHumanConversations(params),
    select: (res) => res.data,
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

// ============================================
// HISTORY
// ============================================

export const useHandoverHistory = (conversationId: string) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.history(conversationId),
    queryFn: () => handoverService.getHistory(conversationId),
    select: (res) => res.data,
    enabled: !!conversationId,
  });
};

// ============================================
// AGENTS
// ============================================

export const useAvailableAgents = (storeId?: string) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.availableAgents(storeId),
    queryFn: () => handoverService.getAvailableAgents(storeId),
    select: (res) => res.data,
    refetchInterval: 30000,
  });
};

export const useAgents = (params?: { store?: string; is_active?: boolean }) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.agents(params),
    queryFn: () => handoverService.getAgents(params),
    select: (res) => res.data,
  });
};

export const useAssignAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      handoverService.assignAgent(conversationId, agentId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Agente atribuído!');
    },
    onError: () => toast.error('Erro ao atribuir agente'),
  });
};

export const useUnassignAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationId: string) => handoverService.unassignAgent(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Agente removido!');
    },
  });
};

// ============================================
// CONFIGURATION
// ============================================

export const useHandoverConfig = (storeId: string) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.config(storeId),
    queryFn: () => handoverService.getConfig(storeId),
    select: (res) => res.data,
    enabled: !!storeId,
  });
};

export const useUpdateHandoverConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: Partial<HandoverConfig> }) =>
      handoverService.updateConfig(storeId, data),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.config(storeId) });
      toast.success('Configuração atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar configuração'),
  });
};

// ============================================
// STATS
// ============================================

export const useHandoverStats = (params?: { store?: string; since?: string; until?: string; group_by?: 'day' | 'week' | 'month' }) => {
  return useQuery({
    queryKey: HANDOVER_KEYS.stats(params),
    queryFn: () => handoverService.getStats(params),
    select: (res) => res.data,
  });
};

// ============================================
// ADDITIONAL ACTIONS
// ============================================

export const useMarkConversationResolved = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data?: Parameters<typeof handoverService.markResolved>[1];
    }) => handoverService.markResolved(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Conversa marcada como resolvida!');
    },
    onError: () => toast.error('Erro ao marcar como resolvida'),
  });
};

export const useTakeOverConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationId: string) => handoverService.takeOver(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.status(conversationId) });
      queryClient.invalidateQueries({ queryKey: HANDOVER_KEYS.activeConversations() });
      toast.success('Você assumiu esta conversa!');
    },
    onError: () => toast.error('Erro ao assumir conversa'),
  });
};

export const useSendTypingIndicator = () => {
  return useMutation({
    mutationFn: ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) =>
      handoverService.sendTypingIndicator(conversationId, isTyping),
  });
};

export default {
  useHandoverStatus,
  useRequestHandover,
  useTransferToHuman,
  useTransferToBot,
  usePendingHandoverRequests,
  useActiveHumanConversations,
  useAvailableAgents,
};
