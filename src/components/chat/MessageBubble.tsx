/**
 * MessageBubble - Balão de mensagem do chat
 * 
 * Melhorias:
 * - Player de áudio funcional inline
 * - Download de documentos corrigido
 * - Preview de mídia melhorado
 * - Melhor responsividade
 */
import React, { useState, useRef, useEffect } from 'react';
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
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  FilmIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

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

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <ClockIcon className="w-3.5 h-3.5 text-gray-400" title="Pendente" />;
    case 'sent':
      return <CheckIcon className="w-3.5 h-3.5 text-gray-400" title="Enviado" />;
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
      return <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-500" title="Falhou" />;
    default:
      return null;
  }
};

// Componente de player de áudio inline
const AudioPlayer: React.FC<{ url: string; mimeType?: string; fileName?: string }> = ({ url, mimeType, fileName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Verificar se a URL é válida
  const isValidUrl = url && (url.startsWith('http') || url.startsWith('https'));

  useEffect(() => {
    if (!isValidUrl) {
      setError('URL de áudio inválida');
      setIsLoading(false);
    }
  }, [isValidUrl]);

  const togglePlay = async () => {
    if (!audioRef.current || !isValidUrl) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Erro ao reproduzir áudio:', err);
      setError('Não foi possível reproduzir o áudio. Formo não suportado.');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    let errorMsg = 'Erro ao carregar áudio';
    
    if (audio.error) {
      switch (audio.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMsg = 'Reprodução abortada';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMsg = 'Erro de rede ao carregar áudio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMsg = 'Formato de áudio não suportado';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = 'Tipo de arquivo não suportado';
          break;
      }
    }
    
    setError(errorMsg);
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isValidUrl) {
    return (
      <div className="w-[280px] bg-gray-100 dark:bg-zinc-800 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-2 text-gray-500">
          <MusicalNoteIcon className="w-5 h-5" />
          <span className="text-sm">Áudio não disponível</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-gray-100 dark:bg-zinc-800 rounded-lg p-3 mb-2">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
        crossOrigin="anonymous"
      >
        <source src={url} type={mimeType?.split(';')[0].trim() || 'audio/ogg'} />
      </audio>

      {error ? (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <SpeakerXMarkIcon className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MusicalNoteIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {fileName || 'Áudio'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <button
              onClick={toggleMute}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-4 h-4" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading || !duration}
            className="w-full h-1.5 bg-gray-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-violet-600 disabled:opacity-50"
          />
        </>
      )}
    </div>
  );
};

const MediaPreview: React.FC<{
  type: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  content?: string | Record<string, unknown>;
  onClick?: () => void;
}> = ({ type, url, mimeType, fileName, content, onClick }) => {
  // Imagem
  if ((type === 'image' || type === 'sticker') && url) {
    return (
      <div 
        className="relative group cursor-pointer mb-2 overflow-hidden rounded-lg"
        onClick={onClick}
      >
        <img
          src={url}
          alt="Imagem"
          className="max-w-[280px] max-h-[200px] object-cover rounded-lg hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <PhotoIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  // Vídeo
  if (type === 'video' && url) {
    return (
      <div 
        className="relative group cursor-pointer mb-2 overflow-hidden rounded-lg"
        onClick={onClick}
      >
        <video
          src={url}
          className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
            <FilmIcon className="w-6 h-6 text-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  // Áudio - Usar player customizado
  if (type === 'audio' && url) {
    return <AudioPlayer url={url} mimeType={mimeType} fileName={fileName} />;
  }

  // Documento
  if (type === 'document') {
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-gray-100/50 dark:bg-black/20 rounded-lg mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/30 transition-colors max-w-[280px]"
        onClick={onClick}
      >
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <DocumentIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {fileName || 'Documento'}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Clique para baixar
          </p>
        </div>
        <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    );
  }

  // Localização
  if (type === 'location') {
    const raw = typeof content === 'string' ? JSON.parse(content) : content;
    const location = (raw as any)?.location ?? raw;
    const lat = location?.latitude;
    const lng = location?.longitude;
    const name = location?.name || location?.address || 'Localização';
    const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    return (
      <a
        href={mapsUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2 max-w-[280px] hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        onClick={mapsUrl ? undefined : (e) => e.preventDefault()}
      >
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPinIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {name}
          </p>
          {lat && lng && (
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
            </p>
          )}
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Abrir no Maps</p>
        </div>
      </a>
    );
  }

  // Contatos
  if (type === 'contacts') {
    return (
      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-2 max-w-[280px]">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Contato
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {typeof content === 'string' ? content : JSON.stringify(content)}
          </p>
        </div>
      </div>
    );
  }

  // Pedido/Compra
  if (type === 'order') {
    const orderData = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch { return {}; } })() : (content || {});
    return (
      <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-2 max-w-[280px]">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingCartIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Pedido WhatsApp</p>
          {(orderData as any)?.product_items?.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {(orderData as any).product_items.length} item(s)
            </p>
          )}
        </div>
      </div>
    );
  }

  // Reação de emoji
  if (type === 'reaction') {
    const reactionData = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch { return {}; } })() : (content || {});
    const emoji = (reactionData as any)?.emoji || '👍';
    return (
      <div className="flex items-center gap-2 py-1 px-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs text-gray-400 dark:text-zinc-500">Reagiu</span>
      </div>
    );
  }

  // Botão de resposta
  if (type === 'button') {
    const btnData = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch { return {}; } })() : (content || {});
    const btnText = (btnData as any)?.text || (btnData as any)?.title || String(content || '');
    return (
      <div className="flex items-center gap-2 mb-1">
        <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
          ↩ {btnText}
        </div>
      </div>
    );
  }

  // Mensagem de sistema
  if (type === 'system') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-gray-400 dark:text-zinc-500 italic px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">
          {typeof content === 'string' ? content : 'Mensagem do sistema'}
        </span>
      </div>
    );
  }

  return null;
};

const InteractiveContent: React.FC<{
  content: string | Record<string, unknown>;
  isInbound: boolean;
}> = ({ content, isInbound }) => {
  const raw: Record<string, unknown> = typeof content === 'string'
    ? (() => { try { return JSON.parse(content); } catch { return {}; } })()
    : content;

  // Inbound messages from WhatsApp are wrapped: { interactive: { type, button_reply|list_reply } }
  const data: Record<string, unknown> = (raw.interactive as Record<string, unknown>) || raw;

  const interactiveType = data.type as string | undefined;

  // Inbound: customer replied to a button
  const buttonReply = (data.button_reply || raw.button_reply) as Record<string, string> | undefined;
  if (buttonReply) {
    return (
      <div className="px-3 pb-2 pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
          ↩ {buttonReply.title || buttonReply.id}
        </div>
      </div>
    );
  }

  // Inbound: customer selected a list item
  const listReply = (data.list_reply || raw.list_reply) as Record<string, string> | undefined;
  if (listReply) {
    return (
      <div className="px-3 pb-2 pt-1">
        <div className="inline-flex flex-col px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300">
          <span>☰ {listReply.title || listReply.id}</span>
          {listReply.description && (
            <span className="font-normal text-blue-500 dark:text-blue-400 mt-0.5">{listReply.description}</span>
          )}
        </div>
      </div>
    );
  }

  // Outbound: buttons message
  if ((interactiveType === 'buttons' || interactiveType === 'button') && Array.isArray(data.buttons)) {
    const buttons = data.buttons as Array<Record<string, string>>;
    return (
      <div className="border-t border-gray-100 dark:border-zinc-700">
        {buttons.map((btn, i) => (
          <div
            key={btn.id || i}
            className="px-3 py-2.5 text-center text-sm font-medium text-blue-600 dark:text-blue-400 border-t border-gray-100 dark:border-zinc-700 first:border-t-0 cursor-default select-none"
          >
            {btn.title || btn.id}
          </div>
        ))}
      </div>
    );
  }

  // Outbound: list message
  if (interactiveType === 'list') {
    const buttonText = (data.button as string) || 'Ver opções';
    const sections = (data.sections as Array<Record<string, unknown>>) || [];
    const totalItems = sections.reduce((acc, s) => {
      const rows = (s.rows as unknown[]) || [];
      return acc + rows.length;
    }, 0);
    return (
      <div className="border-t border-gray-100 dark:border-zinc-700 px-3 py-2">
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
          <span>☰</span>
          <span>{buttonText}</span>
          {totalItems > 0 && (
            <span className="text-xs text-gray-400 dark:text-zinc-500">({totalItems} opções)</span>
          )}
        </div>
      </div>
    );
  }

  // Fallback: unknown interactive type — don't show raw JSON, text_body is already rendered above
  return null;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  id,
  direction,
  messageType,
  status,
  textBody,
  content,
  mediaUrl,
  mediaType,
  fileName,
  mimeType,
  createdAt,
  sentAt,
  deliveredAt,
  readAt,
  errorMessage,
  onMediaClick,
}) => {
  const isInbound = direction === 'inbound';
  const hasMedia = mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType);

  return (
    <div
      className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`max-w-[70%] overflow-hidden ${
          isInbound
            ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white'
            : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white'
        } rounded-lg shadow-sm`}
      >
        {/* Mídia */}
        {hasMedia && (
          <MediaPreview
            type={messageType}
            url={mediaUrl}
            mimeType={mimeType}
            fileName={fileName}
            content={content}
            onClick={() => onMediaClick?.(mediaUrl!, messageType, fileName)}
          />
        )}

        {/* Texto (só mostra se não for caption de mídia já exibida via mediaUrl) */}
        {textBody && !(hasMedia && ['image', 'video', 'document'].includes(messageType)) && (
          <div className="px-3 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">{textBody}</p>
          </div>
        )}

        {/* Caption de mídia abaixo da imagem/video */}
        {textBody && hasMedia && ['image', 'video'].includes(messageType) && (
          <div className="px-3 pt-1 pb-0">
            <p className="text-sm whitespace-pre-wrap break-words">{textBody}</p>
          </div>
        )}

        {/* Conteúdo especial (botões, listas, etc) */}
        {content && messageType === 'interactive' && (
          <InteractiveContent content={content} isInbound={isInbound} />
        )}

        {/* Footer com timestamp e status */}
        <div className="flex items-center justify-end gap-1 px-3 pb-2">
          <span className="text-[10px] text-gray-400">
            {(() => {
              try {
                return createdAt ? format(new Date(createdAt), 'HH:mm', { locale: ptBR }) : '--:--';
              } catch (e) {
                return '--:--';
              }
            })()}
          </span>
          
          {!isInbound && (
            <span className="ml-1">
              <StatusIndicator status={status} />
            </span>
          )}
        </div>

        {/* Erro */}
        {errorMessage && (
          <div className="px-3 pb-2">
            <p className="text-xs text-red-500">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
