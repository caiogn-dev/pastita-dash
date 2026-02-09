import { useState, useCallback, useEffect } from 'react';
import { handoverService, HandoverStatus, HandoverRequest, HumanAgent, HandoverConfig } from '../services/handover';
import toast from 'react-hot-toast';

// ============================================
// STATUS
// ============================================

export const useHandoverStatus = (conversationId: string) => {
  const [status, setStatus] = useState<HandoverStatus | null>(null);
  const [isLoading, setIsLoading] = useState(!!conversationId);

  const fetchStatus = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const res = await handoverService.getStatus(conversationId);
      setStatus(res.data);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, isLoading, refetch: fetchStatus };
};

// ============================================
// REQUEST HANDOVER
// ============================================

export const useRequestHandover = () => {
  const [isLoading, setIsLoading] = useState(false);

  const requestHandover = useCallback(async (
    conversationId: string,
    data?: { reason?: string; priority?: 'low' | 'medium' | 'high' | 'urgent' }
  ) => {
    setIsLoading(true);
    try {
      const res = await handoverService.requestHandover(conversationId, data);
      toast.success('Solicitação enviada! Aguardando aprovação...');
      return res.data;
    } catch (err) {
      toast.error('Erro ao solicitar handover');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { requestHandover, isLoading };
};

// ============================================
// TRANSFER
// ============================================

export const useTransferToHuman = () => {
  const [isLoading, setIsLoading] = useState(false);

  const transferToHuman = useCallback(async (
    conversationId: string,
    data?: { agent_id?: string; reason?: string }
  ) => {
    setIsLoading(true);
    try {
      const res = await handoverService.transferToHuman(conversationId, data);
      toast.success('Conversa transferida para atendente humano!');
      return res.data;
    } catch (err) {
      toast.error('Erro ao transferir');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { transferToHuman, isLoading };
};

export const useTransferToBot = () => {
  const [isLoading, setIsLoading] = useState(false);

  const transferToBot = useCallback(async (conversationId: string, data?: { reason?: string }) => {
    setIsLoading(true);
    try {
      const res = await handoverService.transferToBot(conversationId, data);
      toast.success('Conversa retornada para o bot!');
      return res.data;
    } catch (err) {
      toast.error('Erro ao retornar para bot');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { transferToBot, isLoading };
};

// ============================================
// PENDING REQUESTS
// ============================================

export const usePendingHandoverRequests = () => {
  const [requests, setRequests] = useState<HandoverRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await handoverService.getPendingRequests();
      setRequests(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const approveRequest = useCallback(async (
    conversationId: string,
    requestId: string,
    data?: { agent_id?: string }
  ) => {
    try {
      const res = await handoverService.approveRequest(conversationId, requestId, data);
      await fetchRequests();
      toast.success('Handover aprovado!');
      return res.data;
    } catch (err) {
      toast.error('Erro ao aprovar');
      throw err;
    }
  }, [fetchRequests]);

  const rejectRequest = useCallback(async (conversationId: string, requestId: string) => {
    try {
      await handoverService.rejectRequest(conversationId, requestId);
      await fetchRequests();
      toast.success('Solicitação rejeitada');
    } catch (err) {
      toast.error('Erro ao rejeitar');
      throw err;
    }
  }, [fetchRequests]);

  return { requests, isLoading, refetch: fetchRequests, approveRequest, rejectRequest };
};

// ============================================
// ACTIVE CONVERSATIONS
// ============================================

export const useActiveHumanConversations = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await handoverService.getActiveHumanConversations();
      setConversations(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return { conversations, isLoading, refetch: fetchConversations };
};

// ============================================
// AGENTS
// ============================================

export const useAvailableAgents = (storeId?: string) => {
  const [agents, setAgents] = useState<HumanAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await handoverService.getAvailableAgents(storeId);
      setAgents(res.data);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { agents, isLoading, refetch: fetchAgents };
};

export const useAssignAgent = () => {
  const [isLoading, setIsLoading] = useState(false);

  const assignAgent = useCallback(async (conversationId: string, agentId: string) => {
    setIsLoading(true);
    try {
      const res = await handoverService.assignAgent(conversationId, agentId);
      toast.success('Agente atribuído!');
      return res.data;
    } catch (err) {
      toast.error('Erro ao atribuir agente');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { assignAgent, isLoading };
};

// ============================================
// CONFIG
// ============================================

export const useHandoverConfig = (storeId: string) => {
  const [config, setConfig] = useState<HandoverConfig | null>(null);
  const [isLoading, setIsLoading] = useState(!!storeId);

  const fetchConfig = useCallback(async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const res = await handoverService.getConfig(storeId);
      setConfig(res.data);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (data: Partial<HandoverConfig>) => {
    try {
      const res = await handoverService.updateConfig(storeId, data);
      setConfig(res.data);
      toast.success('Configuração atualizada!');
      return res.data;
    } catch (err) {
      toast.error('Erro ao atualizar configuração');
      throw err;
    }
  }, [storeId]);

  return { config, isLoading, refetch: fetchConfig, updateConfig };
};

export default {
  useHandoverStatus,
  useRequestHandover,
  useTransferToHuman,
  useTransferToBot,
  usePendingHandoverRequests,
  useAvailableAgents,
};
