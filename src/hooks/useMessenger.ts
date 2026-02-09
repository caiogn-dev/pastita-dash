import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messengerService, MessengerAccount, MessengerConversation, MessengerMessage, MessengerProfile, BroadcastMessage, SponsoredMessage } from '../services/messenger';
import toast from 'react-hot-toast';

// Query keys
const MESSENGER_KEYS = {
  accounts: ['messenger', 'accounts'] as const,
  account: (id: string) => ['messenger', 'accounts', id] as const,
  conversations: (accountId?: string) => ['messenger', 'conversations', accountId] as const,
  conversation: (id: string) => ['messenger', 'conversations', id] as const,
  messages: (conversationId: string) => ['messenger', 'messages', conversationId] as const,
  profile: (accountId: string) => ['messenger', 'profile', accountId] as const,
  broadcasts: (accountId?: string) => ['messenger', 'broadcasts', accountId] as const,
  sponsored: (accountId?: string) => ['messenger', 'sponsored', accountId] as const,
};

// Accounts Hooks
export const useMessengerAccounts = () => {
  return useQuery({
    queryKey: MESSENGER_KEYS.accounts,
    queryFn: () => messengerService.getAccounts(),
    select: (res) => res.data,
  });
};

export const useMessengerAccount = (id: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.account(id),
    queryFn: () => messengerService.getAccount(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateMessengerAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof messengerService.createAccount>[0]) =>
      messengerService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.accounts });
      toast.success('Conta Messenger criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar conta Messenger'),
  });
};

export const useUpdateMessengerAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MessengerAccount> }) =>
      messengerService.updateAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.account(id) });
      toast.success('Conta atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar conta'),
  });
};

export const useDeleteMessengerAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.accounts });
      toast.success('Conta removida!');
    },
    onError: () => toast.error('Erro ao remover conta'),
  });
};

export const useVerifyMessengerWebhook = () => {
  return useMutation({
    mutationFn: (id: string) => messengerService.verifyWebhook(id),
    onSuccess: () => toast.success('Webhook verificado!'),
    onError: () => toast.error('Falha na verificação do webhook'),
  });
};

// Conversations Hooks
export const useMessengerConversations = (accountId?: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.conversations(accountId),
    queryFn: () => messengerService.getConversations(accountId),
    select: (res) => res.data,
    enabled: accountId ? true : true, // Always fetch, filtered on backend
  });
};

export const useMessengerConversation = (id: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.conversation(id),
    queryFn: () => messengerService.getConversation(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useMarkConversationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationId: string) =>
      messengerService.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: MESSENGER_KEYS.conversation(conversationId),
      });
    },
  });
};

// Messages Hooks
export const useMessengerMessages = (conversationId: string, params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: [...MESSENGER_KEYS.messages(conversationId), params],
    queryFn: () => messengerService.getMessages(conversationId, params),
    select: (res) => res.data,
    enabled: !!conversationId,
  });
};

export const useSendMessengerMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: Parameters<typeof messengerService.sendMessage>[1];
    }) => messengerService.sendMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: MESSENGER_KEYS.messages(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: MESSENGER_KEYS.conversations(),
      });
    },
    onError: () => toast.error('Erro ao enviar mensagem'),
  });
};

// Profile Hooks
export const useMessengerProfile = (accountId: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.profile(accountId),
    queryFn: () => messengerService.getProfile(accountId),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useUpdateMessengerProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: MessengerProfile }) =>
      messengerService.updateProfile(accountId, data),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.profile(accountId) });
      toast.success('Perfil atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });
};

// Broadcast Hooks
export const useMessengerBroadcasts = (accountId?: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.broadcasts(accountId),
    queryFn: () => messengerService.getBroadcasts(accountId),
    select: (res) => res.data,
  });
};

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<BroadcastMessage>) =>
      messengerService.createBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast criado!');
    },
    onError: () => toast.error('Erro ao criar broadcast'),
  });
};

export const useUpdateBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BroadcastMessage> }) =>
      messengerService.updateBroadcast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast atualizado!');
    },
  });
};

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.deleteBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast removido!');
    },
  });
};

export const useScheduleBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      messengerService.scheduleBroadcast(id, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast agendado!');
    },
  });
};

export const useSendBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.sendBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast enviado!');
    },
  });
};

export const useCancelBroadcast = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.cancelBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.broadcasts() });
      toast.success('Broadcast cancelado!');
    },
  });
};

// Sponsored Message Hooks
export const useMessengerSponsoredMessages = (accountId?: string) => {
  return useQuery({
    queryKey: MESSENGER_KEYS.sponsored(accountId),
    queryFn: () => messengerService.getSponsoredMessages(accountId),
    select: (res) => res.data,
  });
};

export const useCreateSponsoredMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<SponsoredMessage>) =>
      messengerService.createSponsoredMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.sponsored() });
      toast.success('Mensagem patrocinada criada!');
    },
  });
};

export const useUpdateSponsoredMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SponsoredMessage> }) =>
      messengerService.updateSponsoredMessage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.sponsored() });
    },
  });
};

export const useDeleteSponsoredMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.deleteSponsoredMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.sponsored() });
      toast.success('Removido!');
    },
  });
};

export const usePublishSponsoredMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.publishSponsoredMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.sponsored() });
      toast.success('Publicado!');
    },
  });
};

export const usePauseSponsoredMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => messengerService.pauseSponsoredMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_KEYS.sponsored() });
      toast.success('Pausado!');
    },
  });
};

export default {
  useMessengerAccounts,
  useMessengerConversations,
  useMessengerMessages,
  useSendMessengerMessage,
};
