export type ChannelProvider = 'instagram' | 'messenger';

export interface ChannelAccount {
  id: string;
  provider: ChannelProvider;
  name: string;
  handle?: string;
  externalId?: string;
  avatarUrl?: string;
  isActive: boolean;
  webhookVerified?: boolean;
  /** Token recusado pela Meta: ligada, porém muda. */
  precisaReconectar?: boolean;
  lastSyncAt?: string | null;
  raw: unknown;
}

export interface ChannelConversation {
  id: string;
  provider: ChannelProvider;
  accountId: string;
  participantId: string;
  participantName: string;
  participantHandle?: string;
  participantAvatarUrl?: string;
  unreadCount: number;
  status: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
  raw: unknown;
}

export interface ChannelMessage {
  id: string;
  provider: ChannelProvider;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  type: string;
  text?: string;
  mediaUrl?: string;
  status?: string;
  createdAt: string;
  raw: unknown;
}

export interface ChannelSendMessageInput {
  text: string;
}
