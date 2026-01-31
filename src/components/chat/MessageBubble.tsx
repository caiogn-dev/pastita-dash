/**
 * MessageBubble - Chat message bubble with status indicators
 * 
 * Displays message content with visual status indicators:
 * - ✓ (gray) = sent
 * - ✓✓ (gray) = delivered
 * - ✓✓ (blue) = read
 * - ⏳ = pending
 * - ❌ = failed
 */
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  DocumentIcon,
  MapPinIcon,
  UserIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

export interface MessageBubbleProps {
  id: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  textBody: string;
  content?: Record<string, unknown>;
  mediaUrl?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <ClockIcon className="w-3.5 h-3.5 text-gray-400" title="Pendente" />
      );
    case 'sent':
      return (
        <CheckIcon className="w-3.5 h-3.5 text-gray-400" title="Enviado" />
      );
    case 'delivered':
      return (
        <div className="flex -space-x-1" title="Entregue">
          <CheckIcon className="w-3.5 h-3.5 text-gray-400" />
          <CheckIcon className="w-3.5 h-3.5 text-gray-400" />
        </div>
      );
    case 'read':
      return (
        <div className="flex -space-x-1" title="Lido">
          <CheckIconSolid className="w-3.5 h-3.5 text-blue-500" />
          <CheckIconSolid className="w-3.5 h-3.5 text-blue-500" />
        </div>
      );
    case 'failed':
      return (
        <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-500" title="Falhou" />
      );
    default:
      return null;
  }
};

const MediaPreview: React.FC<{ type: string; url?: string; content?: Record<string, unknown> }> = ({ 
  type, 
  url, 
  content 
}) => {
  if (type === 'image' && url) {
    return (
      <img
        src={url}
        alt="Imagem"
        className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ maxHeight: '200px' }}
        onClick={() => window.open(url, '_blank')}
      />
    );
  }

  if (type === 'video' && url) {
    return (
      <video
        src={url}
        controls
        className="max-w-full rounded-lg mb-1"
        style={{ maxHeight: '200px' }}
      />
    );
  }

  if (type === 'audio' && url) {
    return (
      <audio src={url} controls className="w-full mb-1" />
    );
  }

  if (type === 'document') {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-1">
        <DocumentIcon className="w-8 h-8 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-zinc-300">Documento</span>
      </div>
    );
  }

  if (type === 'location') {
    const location = content?.location as { latitude?: number; longitude?: number; name?: string } | undefined;
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-1">
        <MapPinIcon className="w-6 h-6 text-red-500" />
        <span className="text-sm text-gray-600 dark:text-zinc-300">
          {location?.name || 'Localização'}
        </span>
      </div>
    );
  }

  if (type === 'contacts') {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-1">
        <UserIcon className="w-6 h-6 text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-zinc-300">Contato</span>
      </div>
    );
  }

  if (type === 'order') {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-1">
        <ShoppingCartIcon className="w-6 h-6 text-green-500" />
        <span className="text-sm text-gray-600 dark:text-zinc-300">Pedido</span>
      </div>
    );
  }

  if (type === 'sticker' && url) {
    return (
      <img
        src={url}
        alt="Sticker"
        className="w-24 h-24 object-contain"
      />
    );
  }

  return null;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  direction,
  messageType,
  status,
  textBody,
  content,
  mediaUrl,
  createdAt,
  errorMessage,
  isSelected,
  onClick,
}) => {
  const isOutbound = direction === 'outbound';
  const hasMedia = ['image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts', 'order'].includes(messageType);

  return (
    <div
      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-2`}
      onClick={onClick}
    >
      <div
        className={`
          max-w-[70%] rounded-2xl px-4 py-2 shadow-sm
          ${isOutbound
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }
          ${isSelected ? 'ring-2 ring-primary-300' : ''}
          ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        `}
      >
        {/* Media content */}
        {hasMedia && (
          <MediaPreview type={messageType} url={mediaUrl} content={content} />
        )}

        {/* Text content */}
        {textBody && (
          <p className="text-sm whitespace-pre-wrap break-words">{textBody}</p>
        )}

        {/* Error message */}
        {status === 'failed' && errorMessage && (
          <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
        )}

        {/* Timestamp and status */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? 'text-white/70' : 'text-gray-400'}`}>
          <span className="text-[10px]">
            {format(new Date(createdAt), 'HH:mm', { locale: ptBR })}
          </span>
          {isOutbound && <StatusIndicator status={status} />}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
