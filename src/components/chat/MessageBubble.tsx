/**
 * MessageBubble - Balão de mensagem com Chakra UI
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
  useColorModeValue,
  Tooltip,
  Progress,
  Image,
  Link,
  Spinner,
} from '@chakra-ui/react';
import {
  CheckIcon,
  TimeIcon,
  WarningIcon,
  DownloadIcon,
  ViewIcon,
  ChatIcon,
  PhoneIcon,
  EmailIcon,
  LinkIcon,
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
  onMediaClick?: (url: string, type: string, fileName?: string, mimeType?: string) => void;
}

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const color = useColorModeValue('gray.400', 'gray.500');
  const readColor = useColorModeValue('blue.500', 'blue.400');
  const errorColor = useColorModeValue('red.500', 'red.400');

  switch (status) {
    case 'pending':
      return (
        <Tooltip label="Pendente">
          <TimeIcon boxSize={3} color={color} />
        </Tooltip>
      );
    case 'sent':
      return (
        <Tooltip label="Enviado">
          <CheckIcon boxSize={3} color={color} />
        </Tooltip>
      );
    case 'delivered':
      return (
        <Tooltip label="Entregue">
          <HStack spacing={0}>
            <CheckIcon boxSize={3} color={color} />
            <CheckIcon boxSize={3} color={color} ml="-6px" />
          </HStack>
        </Tooltip>
      );
    case 'read':
      return (
        <Tooltip label="Lido">
          <HStack spacing={0}>
            <CheckIcon boxSize={3} color={readColor} />
            <CheckIcon boxSize={3} color={readColor} ml="-6px" />
          </HStack>
        </Tooltip>
      );
    case 'failed':
      return (
        <Tooltip label="Falhou">
          <WarningIcon boxSize={3} color={errorColor} />
        </Tooltip>
      );
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
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const progressColor = useColorModeValue('green.500', 'green.400');

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
    <Box w="250px" p={3} bg={bgColor} borderRadius="lg">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <HStack spacing={3}>
        <IconButton
          aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          icon={isLoading ? <Spinner size="sm" /> : isPlaying ? <Text>⏸</Text> : <Text>▶</Text>}
          size="sm"
          colorScheme="green"
          onClick={togglePlay}
          isDisabled={isLoading}
          borderRadius="full"
        />
        
        <VStack spacing={1} flex={1} align="stretch">
          <Progress 
            value={progress} 
            size="xs" 
            colorScheme="green" 
            borderRadius="full"
          />
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">
              {formatTime(currentTime)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {formatTime(duration)}
            </Text>
          </HStack>
        </VStack>
      </HStack>
      
      {fileName && (
        <Text fontSize="xs" color="gray.500" mt={2} noOfLines={1}>
          {fileName}
        </Text>
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
  const bgColor = useColorModeValue(
    isInbound ? 'white' : 'green.100',
    isInbound ? 'gray.700' : 'green.700'
  );
  const textColor = useColorModeValue(
    isInbound ? 'gray.800' : 'gray.800',
    isInbound ? 'white' : 'white'
  );
  const timestampColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

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
            onClick={() => onMediaClick?.(mediaUrl, 'image', fileName, mimeType)}
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
            <Box
              position="absolute"
              top={2}
              right={2}
              bg="blackAlpha.600"
              p={1}
              borderRadius="md"
            >
              <ViewIcon color="white" boxSize={4} />
            </Box>
          </Box>
        ) : (
          <Text>📷 Imagem</Text>
        );

      case 'video':
        return mediaUrl ? (
          <Box 
            position="relative" 
            cursor="pointer"
            onClick={() => onMediaClick?.(mediaUrl, 'video', fileName, mimeType)}
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
            bg={useColorModeValue('gray.100', 'gray.600')} 
            borderRadius="lg"
            spacing={3}
          >
            <Text fontSize="2xl">📄</Text>
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                {fileName || 'Documento'}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {mimeType || 'Arquivo'}
              </Text>
            </VStack>
            {mediaUrl && (
              <IconButton
                as={Link}
                href={mediaUrl}
                download
                aria-label="Download"
                icon={<DownloadIcon />}
                size="sm"
                variant="ghost"
              />
            )}
          </HStack>
        );

      case 'location':
        const location = typeof content === 'object' ? content : {};
        return (
          <VStack align="start" spacing={2}>
            <Text>📍 Localização</Text>
            {location?.latitude && location?.longitude && (
              <Link
                href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                isExternal
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
          <VStack align="start" spacing={2}>
            <Text>👤 {contacts.length} contato(s)</Text>
            {contacts.map((contact: any, idx: number) => (
              <Box key={idx} p={2} bg={useColorModeValue('gray.100', 'gray.600')} borderRadius="md" w="full">
                <Text fontSize="sm" fontWeight="medium">
                  {contact.name?.formatted_name || 'Contato'}
                </Text>
                {contact.phones?.map((phone: any, pidx: number) => (
                  <HStack key={pidx} spacing={1}>
                    <PhoneIcon boxSize={3} />
                    <Text fontSize="xs">{phone.phone}</Text>
                  </HStack>
                ))}
              </Box>
            ))}
          </VStack>
        );

      case 'order':
        const order = typeof content === 'object' ? content : {};
        const items = order?.order?.product_items || [];
        return (
          <VStack align="start" spacing={2}>
            <Badge colorScheme="green">🛒 Pedido</Badge>
            <Text fontSize="sm">{items.length} item(s)</Text>
          </VStack>
        );

      default:
        return textBody ? (
          <Text whiteSpace="pre-wrap" wordBreak="break-word">
            {textBody}
          </Text>
        ) : (
          <Text fontStyle="italic" color="gray.500">
            Mensagem não disponível
          </Text>
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
        align="end" 
        spacing={2}
        maxW={{ base: '85%', md: '70%' }}
      >
        {isInbound && (
          <Avatar size="xs" bg="gray.400" icon={<ChatIcon />} />
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
          border="1px"
          borderColor={isInbound ? borderColor : 'transparent'}
        >
          <VStack align="stretch" spacing={2}>
            {renderContent()}
            
            <HStack justify="flex-end" spacing={1}>
              <Text fontSize="xs" color={timestampColor}>
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
