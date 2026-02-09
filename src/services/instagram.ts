import api from './api';

// Instagram Account Types
export type InstagramAccountStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'expired';

export interface InstagramAccount {
  id: string;
  instagram_id: string;
  username: string;
  name?: string;
  account_type: 'business' | 'creator';
  status: InstagramAccountStatus;
  is_active: boolean;
  access_token?: string;
  token_expires_at?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  messaging_enabled?: boolean;
  auto_response_enabled?: boolean;
  masked_token?: string;
  active_conversations?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInstagramAccount {
  instagram_id: string;
  username: string;
  name?: string;
  access_token: string;
  account_type: 'business' | 'creator';
  messaging_enabled?: boolean;
  auto_response_enabled?: boolean;
  webhook_verify_token?: string;
  // Legacy fields for compatibility
  instagram_account_id?: string;
  instagram_user_id?: string;
  facebook_page_id?: string;
  app_id?: string;
  app_secret?: string;
}

export interface InstagramAccountStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  unread_messages: number;
  last_message_at?: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Instagram Conversation - ALINHADO COM BACKEND
export interface InstagramConversation {
  id: string;
  account: string;
  instagram_user_id: string;
  username: string;
  participant_id: string;
  participant_username: string;
  participant_name?: string;
  participant_profile_pic?: string;
  profile_picture_url?: string;
  last_message?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  status: 'active' | 'archived' | 'blocked';
  created_at: string;
  updated_at: string;
}

// Instagram Message - ALINHADO COM BACKEND
export interface InstagramMessage {
  id: string;
  conversation: string;
  sender_id: string;
  sender_username: string;
  content: string;
  text_content?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'story_reply' | 'share';
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'seen' | 'failed';
  media_url?: string;
  reactions?: Array<{ emoji: string; user_id: string }>;
  created_at: string;
  is_from_me: boolean;
}

// Media Types (Posts, Stories, Reels)
export type MediaType = 'image' | 'carousel' | 'story' | 'reel';
export type MediaStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface InstagramMedia {
  id: string;
  account: string;
  media_id?: string;
  media_type: MediaType;
  status: MediaStatus;
  caption?: string;
  media_urls: string[];
  permalink?: string;
  thumbnail_url?: string;
  scheduled_at?: string;
  published_at?: string;
  tags?: string[];
  location?: string;
  insights?: {
    impressions?: number;
    reach?: number;
    engagement?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    video_views?: number;
    video_plays?: number;
  };
  created_at: string;
  updated_at: string;
}

// Stories (24h expiry)
export interface InstagramStory {
  id: string;
  account: string;
  media_id?: string;
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  stickers?: Array<{
    type: string;
    position: { x: number; y: number };
    data?: Record<string, any>;
  }>;
  status: MediaStatus;
  published_at?: string;
  expires_at?: string;
  insights?: {
    impressions?: number;
    reach?: number;
    replies?: number;
    taps_forward?: number;
    taps_back?: number;
    exits?: number;
  };
  created_at: string;
}

// Reels
export interface InstagramReel {
  id: string;
  account: string;
  media_id?: string;
  video_url: string;
  cover_url?: string;
  caption?: string;
  audio?: {
    id?: string;
    name?: string;
    artist?: string;
  };
  duration?: number;
  status: MediaStatus;
  share_to_feed: boolean;
  published_at?: string;
  insights?: {
    plays?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    video_views?: number;
    reach?: number;
  };
  created_at: string;
}

// Shopping Catalog
export interface InstagramCatalog {
  id: string;
  account: string;
  catalog_id: string;
  name: string;
  is_active: boolean;
  product_count: number;
  last_sync_at?: string;
  sync_status?: 'idle' | 'syncing' | 'error';
  created_at: string;
  updated_at: string;
}

// Shopping Product
export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'preorder';
export type ProductCondition = 'new' | 'refurbished' | 'used';

export interface InstagramProduct {
  id: string;
  catalog: string;
  product_id?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  condition: ProductCondition;
  image_url: string;
  additional_image_urls?: string[];
  brand?: string;
  sku?: string;
  url?: string;
  checkout_url?: string;
  category?: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Live Streaming
export type LiveStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface InstagramLive {
  id: string;
  account: string;
  live_id?: string;
  title?: string;
  description?: string;
  status: LiveStatus;
  scheduled_start?: string;
  actual_start?: string;
  ended_at?: string;
  stream_url?: string;
  stream_key?: string;
  shopping_enabled: boolean;
  pinned_products?: string[];
  viewer_count?: number;
  total_unique_viewers?: number;
  insights?: {
    peak_viewers?: number;
    comments?: number;
    likes?: number;
    shares?: number;
    duration_seconds?: number;
  };
  created_at: string;
}

// Comment
export interface InstagramComment {
  id: string;
  media: string;
  comment_id: string;
  username: string;
  text: string;
  like_count: number;
  replies_count: number;
  parent_comment?: string;
  is_hidden: boolean;
  created_at: string;
}

// Instagram Service - ALINHADO COM BACKEND REAL
export const instagramService = {
  // Accounts
  getAccounts: () => api.get<PaginatedResponse<InstagramAccount>>('/instagram/accounts/'),
  
  getAccount: (id: string) => api.get<InstagramAccount>(`/instagram/accounts/${id}/`),
  
  createAccount: (data: CreateInstagramAccount) => 
    api.post<InstagramAccount>('/instagram/accounts/', data),
  
  updateAccount: (id: string, data: Partial<InstagramAccount>) =>
    api.patch<InstagramAccount>(`/instagram/accounts/${id}/`, data),
  
  deleteAccount: (id: string) => api.delete(`/instagram/accounts/${id}/`),
  
  refreshToken: (id: string) =>
    api.post(`/instagram/accounts/${id}/refresh-token/`),
  
  syncAccount: (id: string) =>
    api.post(`/instagram/accounts/${id}/sync/`),
  
  getInsights: (id: string, params?: { since?: string; until?: string }) =>
    api.get(`/instagram/accounts/${id}/insights/`, { params }),
  
  // Media (Posts)
  getMedia: (accountId: string, params?: { media_type?: MediaType; status?: MediaStatus }) =>
    api.get<PaginatedResponse<InstagramMedia>>('/instagram/media/', { params: { account: accountId, ...params } }),
  
  getMediaItem: (id: string) => api.get<InstagramMedia>(`/instagram/media/${id}/`),
  
  createPost: (data: {
    account: string;
    caption?: string;
    media_urls: string[];
    tags?: string[];
    location?: string;
  }) => api.post<InstagramMedia>('/instagram/media/', { ...data, media_type: 'image' }),
  
  createCarousel: (data: {
    account: string;
    caption?: string;
    media_urls: string[];
    tags?: string[];
    location?: string;
  }) => api.post<InstagramMedia>('/instagram/media/', { ...data, media_type: 'carousel' }),
  
  updateMedia: (id: string, data: Partial<InstagramMedia>) =>
    api.patch<InstagramMedia>(`/instagram/media/${id}/`, data),
  
  deleteMedia: (id: string) => api.delete(`/instagram/media/${id}/`),
  
  publishMedia: (id: string) =>
    api.post(`/instagram/media/${id}/publish/`),
  
  schedulePost: (data: {
    account: string;
    caption?: string;
    media_urls: string[];
    scheduled_at: string;
    media_type: MediaType;
  }) => api.post<InstagramMedia>('/instagram/media/', data),
  
  getMediaInsights: (id: string) =>
    api.get(`/instagram/media/${id}/insights/`),
  
  // Stories
  getStories: (accountId: string, params?: { status?: MediaStatus }) =>
    api.get<PaginatedResponse<InstagramStory>>('/instagram/stories/', { params: { account: accountId, ...params } }),
  
  getStory: (id: string) => api.get<InstagramStory>(`/instagram/stories/${id}/`),
  
  createStory: (data: {
    account: string;
    media_url: string;
    caption?: string;
    stickers?: any[];
  }) => api.post<InstagramStory>('/instagram/stories/', data),
  
  deleteStory: (id: string) => api.delete(`/instagram/stories/${id}/`),
  
  publishStory: (id: string) =>
    api.post(`/instagram/stories/${id}/publish/`),
  
  // Reels
  getReels: (accountId: string, params?: { status?: MediaStatus }) =>
    api.get<PaginatedResponse<InstagramReel>>('/instagram/reels/', { params: { account: accountId, ...params } }),
  
  getReel: (id: string) => api.get<InstagramReel>(`/instagram/reels/${id}/`),
  
  createReel: (data: {
    account: string;
    video_url: string;
    cover_url?: string;
    caption?: string;
    audio?: any;
    share_to_feed?: boolean;
  }) => api.post<InstagramReel>('/instagram/reels/', data),
  
  updateReel: (id: string, data: Partial<InstagramReel>) =>
    api.patch<InstagramReel>(`/instagram/reels/${id}/`, data),
  
  deleteReel: (id: string) => api.delete(`/instagram/reels/${id}/`),
  
  publishReel: (id: string) =>
    api.post(`/instagram/reels/${id}/publish/`),
  
  // Comments
  getComments: (mediaId: string) =>
    api.get<PaginatedResponse<InstagramComment>>(`/instagram/media/${mediaId}/comments/`),
  
  replyToComment: (mediaId: string, commentId: string, text: string) =>
    api.post(`/instagram/media/${mediaId}/comments/${commentId}/reply/`, { text }),
  
  hideComment: (mediaId: string, commentId: string) =>
    api.post(`/instagram/media/${mediaId}/comments/${commentId}/hide/`),
  
  deleteComment: (mediaId: string, commentId: string) =>
    api.delete(`/instagram/media/${mediaId}/comments/${commentId}/`),
  
  // Shopping - Catalogs
  getCatalogs: (accountId: string) =>
    api.get<PaginatedResponse<InstagramCatalog>>('/instagram/catalogs/', { params: { account: accountId } }),
  
  getCatalog: (id: string) => api.get<InstagramCatalog>(`/instagram/catalogs/${id}/`),
  
  createCatalog: (data: {
    account: string;
    catalog_id: string;
    name: string;
  }) => api.post<InstagramCatalog>('/instagram/catalogs/', data),
  
  updateCatalog: (id: string, data: Partial<InstagramCatalog>) =>
    api.patch<InstagramCatalog>(`/instagram/catalogs/${id}/`, data),
  
  deleteCatalog: (id: string) => api.delete(`/instagram/catalogs/${id}/`),
  
  syncCatalog: (id: string) =>
    api.post(`/instagram/catalogs/${id}/sync/`),
  
  // Shopping - Products
  getProducts: (catalogId: string, params?: { search?: string }) =>
    api.get<PaginatedResponse<InstagramProduct>>('/instagram/products/', { params: { catalog: catalogId, ...params } }),
  
  getProduct: (id: string) => api.get<InstagramProduct>(`/instagram/products/${id}/`),
  
  createProduct: (data: {
    catalog: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    image_url: string;
    availability?: ProductAvailability;
    condition?: ProductCondition;
  }) => api.post<InstagramProduct>('/instagram/products/', data),
  
  updateProduct: (id: string, data: Partial<InstagramProduct>) =>
    api.patch<InstagramProduct>(`/instagram/products/${id}/`, data),
  
  deleteProduct: (id: string) => api.delete(`/instagram/products/${id}/`),
  
  // Live Streaming
  getLives: (accountId: string, params?: { status?: LiveStatus }) =>
    api.get<PaginatedResponse<InstagramLive>>('/instagram/live/', { params: { account: accountId, ...params } }),
  
  getLive: (id: string) => api.get<InstagramLive>(`/instagram/live/${id}/`),
  
  createLive: (data: {
    account: string;
    title?: string;
    description?: string;
    scheduled_start?: string;
    shopping_enabled?: boolean;
  }) => api.post<InstagramLive>('/instagram/live/', data),
  
  updateLive: (id: string, data: Partial<InstagramLive>) =>
    api.patch<InstagramLive>(`/instagram/live/${id}/`, data),
  
  deleteLive: (id: string) => api.delete(`/instagram/live/${id}/`),
  
  startLive: (id: string) => api.post(`/instagram/live/${id}/start/`),
  
  endLive: (id: string) => api.post(`/instagram/live/${id}/end/`),
  
  pinProductToLive: (id: string, productId: string) =>
    api.post(`/instagram/live/${id}/pin-product/`, { product_id: productId }),
  
  unpinProductFromLive: (id: string, productId: string) =>
    api.post(`/instagram/live/${id}/unpin-product/`, { product_id: productId }),
  
  getLiveComments: (id: string) =>
    api.get(`/instagram/live/${id}/comments/`),
  
  // Scheduler
  getScheduledPosts: (accountId: string) =>
    api.get<PaginatedResponse<InstagramMedia>>('/instagram/scheduled/', { params: { account: accountId } }),
  
  cancelScheduledPost: (id: string) =>
    api.post(`/instagram/media/${id}/cancel-schedule/`),
  
  // === MESSAGING/DM ENDPOINTS ===
  
  // Conversations - CORRIGIDO: usa account_id como query param
  getConversations: (params: { account_id: string }) =>
    api.get<PaginatedResponse<InstagramConversation>>('/instagram/conversations/', { params }),
  
  // Messages - CORRIGIDO: usa conversation_id como query param
  getMessages: (params: { conversation_id: string }) =>
    api.get<PaginatedResponse<InstagramMessage>>('/instagram/messages/', { params }),
  
  // Send Message - CORRIGIDO: endpoint e payload alinhados
  sendMessage: (data: {
    account_id: string;
    recipient_id: string;
    text: string;
    message_type?: string;
  }) => api.post<InstagramMessage>('/instagram/send-message/', data),
  
  // Typing Indicator - CORRIGIDO: Graph API format
  sendTyping: (accountId: string, recipientId: string) =>
    api.post('/instagram/typing/', { account_id: accountId, recipient_id: recipientId }),
  
  // Mark as Seen - CORRIGIDO: Graph API format
  markSeen: (accountId: string, senderId: string) =>
    api.post('/instagram/mark-seen/', { account_id: accountId, sender_id: senderId }),
  
  // Account Stats
  getAccountStats: (id: string) =>
    api.get<InstagramAccountStats>(`/instagram/accounts/${id}/stats/`),
  
  // Legacy/Compatibility methods
  syncProfile: (id: string) =>
    api.post<{ synced: boolean }>(`/instagram/accounts/${id}/sync-profile/`),
  
  syncConversations: (id: string) =>
    api.post<{ synced: boolean; count?: number }>(`/instagram/accounts/${id}/sync-conversations/`),
};

export default instagramService;
