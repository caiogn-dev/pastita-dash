// MessageBubble - Versão simplificada
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './MessageBubble.css';

export interface MessageBubbleProps {
  id: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  textBody?: string;
  content?: string | Record<string, unknown>;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
  onMediaClick?: (url: string, type: string, fileName?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  direction,
  messageType,
  status,
  textBody,
  mediaUrl,
  createdAt,
}) => {
  const isInbound = direction === 'inbound';

  const renderContent = () => {
    switch (messageType) {
      case 'image':
        return mediaUrl ? (
          <img src={mediaUrl} alt="Imagem" className="message-image" />
        ) : <span>📷 Imagem</span>;
      case 'audio':
        return mediaUrl ? (
          <audio src={mediaUrl} controls className="message-audio" />
        ) : <span>🎵 Áudio</span>;
      case 'video':
        return <span>🎬 Vídeo</span>;
      case 'document':
        return <span>📄 Documento</span>;
      default:
        return <span className="message-text">{textBody}</span>;
    }
  };

  return (
    <div className={`message-bubble ${direction}`}>
      <div className="bubble-content">{renderContent()}</div>
      <div className="bubble-footer">
        <span className="bubble-time">{format(new Date(createdAt), 'HH:mm', { locale: ptBR })}</span>
        {!isInbound && <span className="bubble-status">{status === 'read' ? '✓✓' : '✓'}</span>}
      </div>
    </div>
  );
};

export default MessageBubble;
