import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  instagramService, 
  InstagramAccount, 
  InstagramMedia, 
  InstagramStory, 
  InstagramReel, 
  InstagramCatalog, 
  InstagramProduct, 
  InstagramLive,
  InstagramComment,
  MediaType,
  MediaStatus,
  ProductAvailability,
  ProductCondition,
} from '../services/instagram';
import toast from 'react-hot-toast';

// Query keys
const INSTAGRAM_KEYS = {
  accounts: ['instagram', 'accounts'] as const,
  account: (id: string) => ['instagram', 'accounts', id] as const,
  
  // Media (Posts)
  media: (accountId: string, params?: Record<string, any>) => 
    ['instagram', 'media', accountId, params] as const,
  mediaItem: (id: string) => ['instagram', 'media', 'item', id] as const,
  
  // Stories
  stories: (accountId: string, params?: Record<string, any>) =>
    ['instagram', 'stories', accountId, params] as const,
  story: (id: string) => ['instagram', 'stories', 'item', id] as const,
  
  // Reels
  reels: (accountId: string, params?: Record<string, any>) =>
    ['instagram', 'reels', accountId, params] as const,
  reel: (id: string) => ['instagram', 'reels', 'item', id] as const,
  
  // Shopping
  catalogs: (accountId: string) => ['instagram', 'catalogs', accountId] as const,
  catalog: (id: string) => ['instagram', 'catalogs', 'item', id] as const,
  products: (catalogId: string, params?: Record<string, any>) =>
    ['instagram', 'products', catalogId, params] as const,
  product: (id: string) => ['instagram', 'products', 'item', id] as const,
  
  // Live
  lives: (accountId: string, params?: Record<string, any>) =>
    ['instagram', 'live', accountId, params] as const,
  live: (id: string) => ['instagram', 'live', 'item', id] as const,
  
  // Comments
  comments: (mediaId: string) => ['instagram', 'comments', mediaId] as const,
  
  // Scheduled
  scheduled: (accountId: string) => ['instagram', 'scheduled', accountId] as const,
};

// ============================================
// ACCOUNTS
// ============================================

export const useInstagramAccounts = () => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.accounts,
    queryFn: () => instagramService.getAccounts(),
    select: (res) => res.data,
  });
};

export const useInstagramAccount = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.account(id),
    queryFn: () => instagramService.getAccount(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateInstagramAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createAccount>[0]) =>
      instagramService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.accounts });
      toast.success('Conta Instagram criada!');
    },
    onError: () => toast.error('Erro ao criar conta'),
  });
};

export const useUpdateInstagramAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InstagramAccount> }) =>
      instagramService.updateAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.account(id) });
      toast.success('Conta atualizada!');
    },
  });
};

export const useDeleteInstagramAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => instagramService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.accounts });
      toast.success('Conta removida!');
    },
  });
};

export const useSyncInstagramAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => instagramService.syncAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.account(id) });
      toast.success('Conta sincronizada!');
    },
  });
};

export const useRefreshInstagramToken = () => {
  return useMutation({
    mutationFn: (id: string) => instagramService.refreshToken(id),
    onSuccess: () => toast.success('Token atualizado!'),
    onError: () => toast.error('Erro ao atualizar token'),
  });
};

// ============================================
// MEDIA (POSTS)
// ============================================

export const useInstagramMedia = (accountId: string, params?: { media_type?: MediaType; status?: MediaStatus }) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.media(accountId, params),
    queryFn: () => instagramService.getMedia(accountId, params),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useInstagramMediaItem = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.mediaItem(id),
    queryFn: () => instagramService.getMediaItem(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createPost>[0]) =>
      instagramService.createPost(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(account, {}) });
      toast.success('Post criado!');
    },
  });
};

export const useCreateCarousel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createCarousel>[0]) =>
      instagramService.createCarousel(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(account, {}) });
      toast.success('Carrossel criado!');
    },
  });
};

export const useUpdateMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InstagramMedia>; accountId: string }) =>
      instagramService.updateMedia(id, data),
    onSuccess: (_, { id, accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.mediaItem(id) });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(accountId, {}) });
      toast.success('Atualizado!');
    },
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.deleteMedia(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(accountId, {}) });
      toast.success('Removido!');
    },
  });
};

export const usePublishMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.publishMedia(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(accountId, {}) });
      toast.success('Publicado!');
    },
  });
};

export const useSchedulePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.schedulePost>[0]) =>
      instagramService.schedulePost(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(account, {}) });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.scheduled(account) });
      toast.success('Agendado!');
    },
  });
};

export const useCancelScheduledPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.cancelScheduledPost(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.media(accountId, {}) });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.scheduled(accountId) });
      toast.success('Cancelado!');
    },
  });
};

// ============================================
// STORIES
// ============================================

export const useInstagramStories = (accountId: string, params?: { status?: MediaStatus }) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.stories(accountId, params),
    queryFn: () => instagramService.getStories(accountId, params),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useInstagramStory = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.story(id),
    queryFn: () => instagramService.getStory(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateStory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createStory>[0]) =>
      instagramService.createStory(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.stories(account, {}) });
      toast.success('Story criado!');
    },
  });
};

export const useDeleteStory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.deleteStory(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.stories(accountId, {}) });
      toast.success('Removido!');
    },
  });
};

export const usePublishStory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.publishStory(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.stories(accountId, {}) });
      toast.success('Publicado!');
    },
  });
};

// ============================================
// REELS
// ============================================

export const useInstagramReels = (accountId: string, params?: { status?: MediaStatus }) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.reels(accountId, params),
    queryFn: () => instagramService.getReels(accountId, params),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useInstagramReel = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.reel(id),
    queryFn: () => instagramService.getReel(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createReel>[0]) =>
      instagramService.createReel(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.reels(account, {}) });
      toast.success('Reel criado!');
    },
  });
};

export const useUpdateReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data, accountId }: { id: string; data: Partial<InstagramReel>; accountId: string }) =>
      instagramService.updateReel(id, data),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.reels(accountId, {}) });
      toast.success('Atualizado!');
    },
  });
};

export const useDeleteReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.deleteReel(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.reels(accountId, {}) });
      toast.success('Removido!');
    },
  });
};

export const usePublishReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.publishReel(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.reels(accountId, {}) });
      toast.success('Publicado!');
    },
  });
};

// ============================================
// SHOPPING - CATALOGS
// ============================================

export const useInstagramCatalogs = (accountId: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.catalogs(accountId),
    queryFn: () => instagramService.getCatalogs(accountId),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useInstagramCatalog = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.catalog(id),
    queryFn: () => instagramService.getCatalog(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateCatalog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createCatalog>[0]) =>
      instagramService.createCatalog(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.catalogs(account) });
      toast.success('Catálogo criado!');
    },
  });
};

export const useUpdateCatalog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data, accountId }: { id: string; data: Partial<InstagramCatalog>; accountId: string }) =>
      instagramService.updateCatalog(id, data),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.catalogs(accountId) });
      toast.success('Atualizado!');
    },
  });
};

export const useDeleteCatalog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.deleteCatalog(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.catalogs(accountId) });
      toast.success('Removido!');
    },
  });
};

export const useSyncCatalog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.syncCatalog(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.catalogs(accountId) });
      toast.success('Sincronizado!');
    },
  });
};

// ============================================
// SHOPPING - PRODUCTS
// ============================================

export const useInstagramProducts = (catalogId: string, params?: { search?: string }) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.products(catalogId, params),
    queryFn: () => instagramService.getProducts(catalogId, params),
    select: (res) => res.data,
    enabled: !!catalogId,
  });
};

export const useInstagramProduct = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.product(id),
    queryFn: () => instagramService.getProduct(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createProduct>[0]) =>
      instagramService.createProduct(data),
    onSuccess: (_, { catalog }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.products(catalog, {}) });
      toast.success('Produto criado!');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data, catalogId }: { id: string; data: Partial<InstagramProduct>; catalogId: string }) =>
      instagramService.updateProduct(id, data),
    onSuccess: (_, { catalogId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.products(catalogId, {}) });
      toast.success('Atualizado!');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, catalogId }: { id: string; catalogId: string }) =>
      instagramService.deleteProduct(id),
    onSuccess: (_, { catalogId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.products(catalogId, {}) });
      toast.success('Removido!');
    },
  });
};

// ============================================
// LIVE STREAMING
// ============================================

export const useInstagramLives = (accountId: string, params?: Record<string, any>) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.lives(accountId, params),
    queryFn: () => instagramService.getLives(accountId, params),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export const useInstagramLive = (id: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.live(id),
    queryFn: () => instagramService.getLive(id),
    select: (res) => res.data,
    enabled: !!id,
  });
};

export const useCreateLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof instagramService.createLive>[0]) =>
      instagramService.createLive(data),
    onSuccess: (_, { account }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.lives(account, {}) });
      toast.success('Live criada!');
    },
  });
};

export const useUpdateLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data, accountId }: { id: string; data: Partial<InstagramLive>; accountId: string }) =>
      instagramService.updateLive(id, data),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.lives(accountId, {}) });
      toast.success('Atualizada!');
    },
  });
};

export const useDeleteLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.deleteLive(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.lives(accountId, {}) });
      toast.success('Removida!');
    },
  });
};

export const useStartLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.startLive(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.lives(accountId, {}) });
      toast.success('Live iniciada!');
    },
  });
};

export const useEndLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      instagramService.endLive(id),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.lives(accountId, {}) });
      toast.success('Live encerrada!');
    },
  });
};

export const usePinProductToLive = () => {
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      instagramService.pinProductToLive(id, productId),
    onSuccess: () => toast.success('Produto fixado!'),
  });
};

export const useUnpinProductFromLive = () => {
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      instagramService.unpinProductFromLive(id, productId),
    onSuccess: () => toast.success('Produto desafixado!'),
  });
};

// ============================================
// COMMENTS
// ============================================

export const useInstagramComments = (mediaId: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.comments(mediaId),
    queryFn: () => instagramService.getComments(mediaId),
    select: (res) => res.data,
    enabled: !!mediaId,
  });
};

export const useReplyToComment = () => {
  return useMutation({
    mutationFn: ({ mediaId, commentId, text }: { mediaId: string; commentId: string; text: string }) =>
      instagramService.replyToComment(mediaId, commentId, text),
    onSuccess: () => toast.success('Resposta enviada!'),
  });
};

export const useHideComment = () => {
  return useMutation({
    mutationFn: ({ mediaId, commentId }: { mediaId: string; commentId: string }) =>
      instagramService.hideComment(mediaId, commentId),
    onSuccess: () => toast.success('Comentário oculto!'),
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ mediaId, commentId }: { mediaId: string; commentId: string }) =>
      instagramService.deleteComment(mediaId, commentId),
    onSuccess: (_, { mediaId }) => {
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_KEYS.comments(mediaId) });
      toast.success('Comentário removido!');
    },
  });
};

// ============================================
// SCHEDULER
// ============================================

export const useScheduledPosts = (accountId: string) => {
  return useQuery({
    queryKey: INSTAGRAM_KEYS.scheduled(accountId),
    queryFn: () => instagramService.getScheduledPosts(accountId),
    select: (res) => res.data,
    enabled: !!accountId,
  });
};

export default {
  useInstagramAccounts,
  useInstagramMedia,
  useInstagramStories,
  useInstagramReels,
  useInstagramCatalogs,
  useInstagramProducts,
  useInstagramLives,
};
