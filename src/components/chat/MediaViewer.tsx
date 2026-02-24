/**
 * MediaViewer - Visualizador de mídia com Chakra UI v3
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  IconButton,
  HStack,
  VStack,
  Text,
  Box,
  Image,
  Spinner,
  Link,
  Flex,
} from '@chakra-ui/react';
import {
  Close,
  Download,
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
        <VStack gap={4} p={8} bg="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="6xl">🎵</Text>
          <audio src={url} controls style={{ width: '300px' }} />
          {fileName && <Text color="white" fontSize="sm">{fileName}</Text>}
        </VStack>
      );
    }

    if (isDocument) {
      return (
        <VStack gap={4} p={8} bg="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="6xl">📄</Text>
          <Text color="white" fontSize="lg" fontWeight="bold">{fileName || 'Documento'}</Text>
          {mimeType && <Text color="gray.400" fontSize="sm">{mimeType}</Text>}
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
      <VStack gap={4}>
        <Text fontSize="6xl">📎</Text>
        <Text color="white">Tipo de arquivo não suportado</Text>
      </VStack>
    );
  };

  return (
    <Dialog open={true} onClose={onClose} size="full">
      <DialogBackdrop bg="blackAlpha.800" />
      
      <DialogContent bg="transparent" boxShadow="none">
        <DialogHeader display="flex" justifyContent="flex-end" p={4}>
          <HStack gap={2}>
            <IconButton
              aria-label="Baixar"
              onClick={handleDownload}
              variant="ghost"
              colorScheme="whiteAlpha"
            >
              <Download />
            </IconButton>
            
            <IconButton
              aria-label="Fechar"
              onClick={onClose}
              variant="ghost"
              colorScheme="whiteAlpha"
            >
              <Close />
            </IconButton>
          </HStack>
        </DialogHeader>

        <DialogBody 
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
        </DialogBody>

        {fileName && (
          <DialogFooter justifyContent="center">
            <Text color="whiteAlpha.800" fontSize="sm">{fileName}</Text>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewer;
