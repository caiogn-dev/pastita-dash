import type { Message } from '../../types';
import type { MessageBubbleProps } from './MessageBubble';

/** Mensagem da API → props do balão. Inbox e bolinha do WhatsApp usam o mesmo. */
export const messageToBubbleProps = (msg: Message): MessageBubbleProps => ({
  id: msg.id,
  direction: msg.direction as 'inbound' | 'outbound',
  messageType: msg.message_type,
  status: msg.status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  textBody: msg.text_body || msg.media_caption || msg.caption,
  content: msg.content,
  mediaUrl: msg.media_url,
  mediaType: msg.media_mime_type || msg.media_type,
  mimeType: msg.media_mime_type,
  fileName: msg.media_filename || msg.file_name,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
});
