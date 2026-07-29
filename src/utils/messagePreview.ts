import type { Message } from '../types';

/** Preview curto de uma mensagem para a lista de conversas (estilo WhatsApp). */
export function messagePreviewText(msg: Message | string | undefined): string {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  if (msg.text_body) return msg.text_body;
  switch (msg.message_type) {
    case 'audio': return '🎵 Áudio';
    case 'image': return '📷 Imagem';
    case 'video': return '🎬 Vídeo';
    case 'document': return `📄 ${msg.media_filename || 'Documento'}`;
    case 'sticker': return '🏷️ Sticker';
    case 'location': return '📍 Localização';
    case 'contacts': return '👤 Contato';
    case 'order': return '🛒 Pedido';
    case 'reaction': return '👍 Reação';
    default: return msg.message_type || 'Mensagem';
  }
}
