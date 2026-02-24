/**
 * MessageBubble - Balão de mensagem com Chakra UI v3
 */
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
  IconButton,
  Avatar,
  Badge,
  Image,
  Link,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import {
  Check,
  Time,
  Warning,
  Download,
  View,
} from '@chakra-ui/icons';

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
      return <Time boxSize={3} color="gray.400" />;
    case 'sent':
      return <Check boxSize={3} color="gray.400" />;
    case 'delivered':
      return (
        <HStack gap={0}>
          <Check boxSize={3} color="gray.400" />
          <Check boxSize={3} color="gray.400" ml="-6px" />
        </HStack>
      );
    case 'read':
      return (
        <HStack gap={0}>
          <Check boxSize={3} color="blue.500" />
          <Check boxSize={3} color="blue.500" ml="-6px" />
        </HStack>
      );
    case 'failed':
      return <Warning boxSize={3} color="red.500" />;
    default:
      return null;
  }
};

// Componente de player de áudio inline
const AudioPlayer: React.FC<{ url: string; fileName?: string }> = ({ url, fileName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Box w="250px" p={3} bg="gray.100" borderRadius="lg">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <HStack gap={3}>
        <IconButton
          aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          onClick={togglePlay}
          disabled={isLoading}
          size="sm"
          colorScheme="green"
          borderRadius="full"
        >
          {isLoading ? <Spinner size="sm" /> : isPlaying ? '⏸' : '▶'}
        </IconButton>
        
        <VStack gap={1} flex={1} align="stretch">
          <Progress value={progress} size="xs" colorScheme="green" borderRadius="full" />
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">{formatTime(currentTime)}</Text>
            <Text fontSize="xs" color="gray.500">{formatTime(duration)}</Text>
          </HStack>
        </VStack>
      </HStack>
      
      {fileName && (
        <Text fontSize="xs" color="gray.500" mt={2} truncate>{fileName}</Text>
      )}
    </Box>
  );
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
  const bgColor = isInbound ? 'white' : 'green.100';
  const textColor = 'gray.800';

  const renderContent = () => {
    switch (messageType) {
      case 'audio':
        return mediaUrl ? (
          <AudioPlayer url={mediaUrl} fileName={fileName} />
        ) : (
          <Text>🎵 Áudio</Text>
        );

      case 'image':
        return mediaUrl ? (
          <Box 
            position="relative" 
            cursor="pointer"
            onClick={() => onMediaClick?.(mediaUrl, 'image', fileName)}
            borderRadius="lg"
            overflow="hidden"
          >
            <Image
              src={mediaUrl}
              alt={fileName || 'Imagem'}
              maxW="300px"
              maxH="300px"
              objectFit="cover"
              fallback={<Spinner />}
            />
          </Box>
        ) : (
          <Text>📷 Imagem</Text>
        );

      case 'video':
        return mediaUrl ? (
          <Box 
            position="relative" 
            cursor="pointer"
            onClick={() => onMediaClick?.(mediaUrl, 'video', fileName)}
            borderRadius="lg"
            overflow="hidden"
            bg="black"
          >
            <Box w="300px" h="200px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="4xl">🎬</Text>
            </Box>
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="whiteAlpha.800"
              p={3}
              borderRadius="full"
            >
              <Text fontSize="2xl">▶</Text>
            </Box>
          </Box>
        ) : (
          <Text>🎬 Vídeo</Text>
        );

      case 'document':
        return (
          <HStack 
            p={3} 
            bg="gray.100"
            borderRadius="lg"
            gap={3}
          >
            <Text fontSize="2xl">📄</Text>
            <VStack align="flex-start" gap={0} flex={1}>
              <Text fontSize="sm" fontWeight="medium" truncate>{fileName || 'Documento'}</Text>
              <Text fontSize="xs" color="gray.500">{mimeType || 'Arquivo'}</Text>
            </VStack>
            {mediaUrl && (
              <IconButton
                as={Link}
                href={mediaUrl}
                download
                aria-label="Download"
                size="sm"
                variant="ghost"
              >
                <Download />
              </IconButton>
            )}
          </HStack>
        );

      case 'location':
        const location = typeof content === 'object' ? content : {};
        return (
          <VStack align="flex-start" gap={2}>
            <Text>📍 Localização</Text>
            {location?.latitude && location?.longitude && (
              <Link
                href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                target="_blank"
                color="blue.500"
                fontSize="sm"
              >
                Ver no mapa ↗
              </Link>
            )}
          </VStack>
        );

      case 'contacts':
        const contacts = typeof content === 'object' ? (content?.contacts || []) : [];
        return (
          <VStack align="flex-start" gap={2}>
            <Text>👤 {contacts.length} contato(s)</Text>
            {contacts.map((contact: any, idx: number) => (
              <Box key={idx} p={2} bg="gray.100" borderRadius="md" w="full">
                <Text fontSize="sm" fontWeight="medium">{contact.name?.formatted_name || 'Contato'}</Text>
              </Box>
            ))}
          </VStack>
        );

      case 'order':
        const order = typeof content === 'object' ? content : {};
        const items = order?.order?.product_items || [];
        return (
          <VStack align="flex-start" gap={2}>
            <Badge colorScheme="green">🛒 Pedido</Badge>
            <Text fontSize="sm">{items.length} item(s)</Text>
          </VStack>
        );

      default:
        return textBody ? (
          <Text whiteSpace="pre-wrap" wordBreak="break-word">{textBody}</Text>
        ) : (
          <Text fontStyle="italic" color="gray.500">Mensagem não disponível</Text>
        );
    }
  };

  return (
    <Flex
      w="full"
      justify={isInbound ? 'flex-start' : 'flex-end'}
      py={1}
    >
      <HStack 
        align="flex-end" 
        gap={2}
        maxW={{ base: '85%', md: '70%' }}
      >
        {isInbound && (
          <Avatar size="xs" bg="gray.400" />
        )}
        
        <Box
          bg={bgColor}
          color={textColor}
          px={4}
          py={2}
          borderRadius="2xl"
          borderBottomLeftRadius={isInbound ? '4px' : '2xl'}
          borderBottomRightRadius={isInbound ? '2xl' : '4px'}
          boxShadow="sm"
        >
          <VStack align="stretch" gap={2}>
            {renderContent()}
            
            <HStack justify="flex-end" gap={1}>
              <Text fontSize="xs" color="gray.500">
                {format(new Date(createdAt), 'HH:mm', { locale: ptBR })}
              </Text>
              {!isInbound && <StatusIndicator status={status} />}
            </HStack>
          </VStack>
        </Box>
      </HStack>
    </Flex>
  );
};

export default MessageBubble;
