import { normalizePaginatedEnvelope } from '../../services/api';
import { instagramAccountService, instagramDirectService, InstagramAccount, InstagramConversation, InstagramMessage } from '../../services/instagram';
import { messengerService, MessengerAccount, MessengerConversation, MessengerMessage } from '../../services/messenger';
import { ChannelAccount, ChannelConversation, ChannelMessage, ChannelProvider, ChannelSendMessageInput } from './types';

const providerLabel: Record<ChannelProvider, string> = {
  instagram: 'Instagram',
  messenger: 'Messenger',
};

const toInstagramAccount = (account: InstagramAccount): ChannelAccount => ({
  id: account.id,
  provider: 'instagram',
  name: account.username ? `@${account.username}` : 'Instagram',
  handle: account.username,
  externalId: account.instagram_business_id,
  avatarUrl: account.profile_picture_url,
  isActive: account.is_active,
  webhookVerified: account.is_verified,
  lastSyncAt: account.last_sync_at,
  raw: account,
});

const toMessengerAccount = (account: MessengerAccount): ChannelAccount => ({
  id: account.id,
  provider: 'messenger',
  name: account.page_name || account.name || 'Messenger',
  externalId: account.page_id,
  isActive: account.is_active,
  webhookVerified: account.webhook_verified,
  lastSyncAt: account.updated_at,
  raw: account,
});

const toInstagramConversation = (conversation: InstagramConversation): ChannelConversation => ({
  id: conversation.id,
  provider: 'instagram',
  accountId: conversation.account,
  participantId: conversation.participant_id,
  participantName: conversation.participant_name || conversation.participant_username || conversation.participant_id,
  participantHandle: conversation.participant_username,
  participantAvatarUrl: conversation.participant_profile_pic,
  unreadCount: conversation.unread_count || 0,
  status: conversation.status || (conversation.is_active ? 'active' : 'closed'),
  lastMessageAt: conversation.last_message_at,
  lastMessagePreview: conversation.last_message_preview || (typeof conversation.last_message?.content === 'string' ? conversation.last_message.content : '') || '',
  raw: conversation,
});

const toMessengerConversation = (conversation: MessengerConversation): ChannelConversation => ({
  id: conversation.id,
  provider: 'messenger',
  accountId: conversation.account,
  participantId: conversation.psid,
  participantName: conversation.participant_name || conversation.psid,
  participantAvatarUrl: conversation.participant_profile_pic,
  unreadCount: conversation.unread_count || 0,
  status: conversation.status || (conversation.is_active ? 'active' : 'closed'),
  lastMessageAt: conversation.last_message_at,
  lastMessagePreview: conversation.last_message_preview || (typeof conversation.last_message?.content === 'string' ? conversation.last_message.content : '') || '',
  raw: conversation,
});

const toInstagramMessage = (message: InstagramMessage): ChannelMessage => ({
  id: message.id,
  provider: 'instagram',
  conversationId: message.conversation,
  direction: message.direction || (message.is_from_business ? 'outbound' : 'inbound'),
  type: message.message_type || 'TEXT',
  text: typeof message.content === 'string' ? message.content : undefined,
  mediaUrl: message.media_url,
  status: message.status,
  createdAt: message.created_at,
  raw: message,
});

const toMessengerMessage = (message: MessengerMessage): ChannelMessage => ({
  id: message.id,
  provider: 'messenger',
  conversationId: message.conversation,
  direction: message.direction || (message.is_from_page ? 'outbound' : 'inbound'),
  type: message.message_type,
  text: typeof message.content === 'string' ? message.content : undefined,
  mediaUrl: message.attachment_url,
  status: message.status,
  createdAt: message.created_at,
  raw: message,
});

export const channelsApi = {
  providerLabel,

  async listAccounts(provider?: ChannelProvider): Promise<ChannelAccount[]> {
    const providers: ChannelProvider[] = provider ? [provider] : ['instagram', 'messenger'];
    const results = await Promise.all(providers.map(async item => {
      if (item === 'instagram') {
        const response = await instagramAccountService.list();
        return normalizePaginatedEnvelope<InstagramAccount>(response.data).results.map(toInstagramAccount);
      }
      const response = await messengerService.getAccounts();
      return normalizePaginatedEnvelope<MessengerAccount>(response.data).results.map(toMessengerAccount);
    }));
    return results.flat();
  },

  async getInstagramConnectUrl(): Promise<string> {
    const response = await instagramAccountService.getConnectUrl();
    return response.data.url;
  },

  async listConversations(provider: ChannelProvider, accountId?: string): Promise<ChannelConversation[]> {
    if (provider === 'instagram') {
      const response = await instagramDirectService.getConversations(accountId);
      return normalizePaginatedEnvelope<InstagramConversation>(response.data).results.map(toInstagramConversation);
    }
    const response = await messengerService.getConversations(accountId);
    return normalizePaginatedEnvelope<MessengerConversation>(response.data).results.map(toMessengerConversation);
  },

  async listMessages(provider: ChannelProvider, conversationId: string): Promise<ChannelMessage[]> {
    if (provider === 'instagram') {
      const response = await instagramDirectService.getMessages(conversationId);
      return normalizePaginatedEnvelope<InstagramMessage>(response.data).results.map(toInstagramMessage);
    }
    const response = await messengerService.getMessages(conversationId);
    return normalizePaginatedEnvelope<MessengerMessage>(response.data).results.map(toMessengerMessage);
  },

  async sendMessage(provider: ChannelProvider, conversationId: string, input: ChannelSendMessageInput): Promise<ChannelMessage> {
    if (provider === 'instagram') {
      const response = await instagramDirectService.sendMessage(conversationId, {
        content: input.text,
        message_type: 'TEXT',
      });
      return toInstagramMessage(response.data);
    }
    const response = await messengerService.sendMessage(conversationId, {
      content: input.text,
      message_type: 'text',
    });
    return toMessengerMessage(response.data);
  },

  async markRead(provider: ChannelProvider, conversationId: string): Promise<void> {
    if (provider === 'instagram') {
      await instagramDirectService.markAsRead(conversationId);
      return;
    }
    await messengerService.markAsRead(conversationId);
  },
};

export default channelsApi;
