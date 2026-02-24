/**
 * MediaViewer - Visualizador de mídia com Chakra UI
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  IconButton,
  HStack,
  VStack,
  Text,
  Box,
  Image,
  Spinner,
  useColorModeValue,
  Tooltip,
  Link,
  Progress,
  Flex,
} from '@chakra-ui/react';
import {
  CloseIcon,
  DownloadIcon,
} from '@chakra-ui/icons';

export interface MediaViewerProps {
  url: string;
  type: string;
  fileName?: string;
  mimeType?: string;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  type,
  fileName,
  mimeType,
  onClose,
}) => {
  const isImage = type.startsWith('image/') || ['image', 'sticker'].includes(type);
  const isVideo = type.startsWith('video/') || type === 'video';
  const isAudio = type.startsWith('audio/') || type === 'audio';
  const isDocument = !isImage && !isVideo && !isAudio;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('blackAlpha.800', 'blackAlpha.900');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (isImage) {
      return (
        <Box position="relative">
          {isLoading && (
            <Flex position="absolute" inset={0} justify="center" align="center">
              <Spinner size="xl" color="white" />
            </Flex>
          )}
          <Image
            src={url}
            alt={fileName || 'Imagem'}
            maxH="70vh"
            maxW="90vw"
            objectFit="contain"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Erro ao carregar imagem');
            }}
          />
        </Box>
      );
    }

    if (isVideo) {
      return (
        <Box 
          as="video" 
          src={url} 
          controls 
          maxH="70vh" 
          maxW="90vw"
          borderRadius="md"
          onLoadedData={() => setIsLoading(false)}
        />
      );
    }

    if (isAudio) {
      return (
        <VStack spacing={4} p={8} bg="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="6xl">🎵</Text>
          <audio src={url} controls style={{ width: '300px' }} />
          {fileName && (
            <Text color="white" fontSize="sm">{fileName}</Text>
          )}
        </VStack>
      );
    }

    if (isDocument) {
      return (
        <VStack spacing={4} p={8} bg="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="6xl">📄</Text>
          <Text color="white" fontSize="lg" fontWeight="bold">
            {fileName || 'Documento'}
          </Text>
          {mimeType && (
            <Text color="gray.400" fontSize="sm">{mimeType}</Text>
          )}
          <Link
            href={url}
            download
            color="green.400"
            fontSize="sm"
            mt={4}
          >
            ⬇️ Baixar arquivo
          </Link>
        </VStack>
      );
    }

    return (
      <VStack spacing={4}>
        <Text fontSize="6xl">📎</Text>
        <Text color="white">Tipo de arquivo não suportado</Text>
      </VStack>
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="full" isCentered>
      <ModalOverlay bg={bgColor} />
      
      <ModalContent bg="transparent" boxShadow="none">
        <ModalHeader display="flex" justifyContent="flex-end" p={4}>
          <HStack spacing={2}>
            <Tooltip label="Baixar">
              <IconButton
                aria-label="Baixar"
                icon={<DownloadIcon />}
                colorScheme="whiteAlpha"
                onClick={handleDownload}
              />
            </Tooltip>
            
            <Tooltip label="Fechar">
              <IconButton
                aria-label="Fechar"
                icon={<CloseIcon />}
                colorScheme="whiteAlpha"
                onClick={onClose}
              />
            </Tooltip>
          </HStack>
        </ModalHeader>

        <ModalBody 
          display="flex" 
          justifyContent="center" 
          alignItems="center"
          p={4}
        >
          {error ? (
            <Text color="red.400">{error}</Text>
          ) : (
            renderContent()
          )}
        </ModalBody>

        {fileName && (
          <ModalFooter justifyContent="center">
            <Text color="whiteAlpha.800" fontSize="sm">
              {fileName}
            </Text>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MediaViewer;
