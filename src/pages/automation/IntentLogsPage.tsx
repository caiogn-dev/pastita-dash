import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  VStack,
  Input,
  Select,
  Button,
  IconButton,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Code,
  Box,
  Flex,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  SearchIcon,
  RepeatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ViewIcon,
} from '@chakra-ui/icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentLog, IntentType } from '../../types';

const ITEMS_PER_PAGE = 20;

const methodColors: Record<string, string> = {
  regex: 'green',
  llm: 'purple',
  handler: 'blue',
  fallback: 'orange',
};

export const IntentLogsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [logs, setLogs] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntentLog | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<IntentType | ''>('');
  const [methodFilter, setMethodFilter] = useState<'regex' | 'llm' | ''>('');

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await intentService.getLogs({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        intent_type: intentFilter || undefined,
        method: methodFilter || undefined,
      });
      setLogs(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, intentFilter, methodFilter, companyId]);

  // Filtrar por busca local
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message_text?.toLowerCase().includes(search) ||
      log.phone_number?.includes(search) ||
      log.handler_used?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Logs de Intenções</Heading>
            <Text color="gray.500">Histórico de detecção de intenções</Text>
          </VStack>
          
          <Button
            leftIcon={<RepeatIcon />}
            onClick={loadLogs}
            colorScheme="green"
            variant="outline"
          >
            Atualizar
          </Button>
        </HStack>

        {/* Filters */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <InputGroup maxW="300px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Buscar mensagem, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>

              <Select 
                placeholder="Todas intenções"
                value={intentFilter}
                onChange={(e) => {
                  setIntentFilter(e.target.value as IntentType);
                  setCurrentPage(1);
                }}
                w="200px"
              >
                {Object.entries(intentTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>

              <Select
                placeholder="Todos métodos"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value as 'regex' | 'llm');
                  setCurrentPage(1);
                }}
                w="200px"
              >
                <option value="regex">Regex/Handler</option>
                <option value="llm">LLM/IA</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {/* Table */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth={1} overflow="hidden">
          <CardBody p={0}>
            {loading ? (
              <Flex justify="center" align="center" py={8}>
                <Spinner size="xl" color="green.500" />
              </Flex>
            ) : filteredLogs.length === 0 ? (
              <Flex justify="center" align="center" py={8} direction="column" gap={4}>
                <Text fontSize="4xl">📋</Text>
                <Text color="gray.500">Nenhum log encontrado</Text>
              </Flex>
            ) : (
              <Table variant="simple">
                <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Tr>
                    <Th>Data/Hora</Th>
                    <Th>Telefone</Th>
                    <Th>Mensagem</Th>
                    <Th>Intenção</Th>
                    <Th>Método</Th>
                    <Th>Ações</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredLogs.map((log) => (
                    <Tr key={log.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                      <Td>
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </Td>
                      <Td>
                        <Text fontFamily="mono" fontSize="sm">
                          {log.phone_number}
                        </Text>
                      </Td>
                      <Td maxW="300px">
                        <Text noOfLines={2} fontSize="sm">
                          {log.message_text}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme="blue">
                          {intentTypeLabels[log.intent_type as IntentType] || log.intent_type}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={methodColors[log.method] || 'gray'}>
                          {log.method?.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <IconButton
                          aria-label="Ver detalhes"
                          icon={<ViewIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Pagination */}
        <HStack justify="space-between">
          <Text color="gray.500" fontSize="sm">
            Mostrando {filteredLogs.length} de {totalCount} registros
          </Text>
          
          <HStack>
            <IconButton
              aria-label="Página anterior"
              icon={<ChevronLeftIcon />}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              isDisabled={currentPage === 1}
            />
            
            <Text fontSize="sm">
              Página {currentPage} de {totalPages}
            </Text>
            
            <IconButton
              aria-label="Próxima página"
              icon={<ChevronRightIcon />}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              isDisabled={currentPage >= totalPages}
            />
          </HStack>
        </HStack>
      </VStack>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalhes do Log</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {selectedLog && (
              <VStack spacing={4} align="stretch">
                <HStack>
                  <Text fontWeight="bold" w="120px">Data/Hora:</Text>
                  <Text>
                    {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </Text>
                </HStack>
                
                <HStack>
                  <Text fontWeight="bold" w="120px">Telefone:</Text>
                  <Text fontFamily="mono">{selectedLog.phone_number}</Text>
                </HStack>
                
                <HStack>
                  <Text fontWeight="bold" w="120px">Intenção:</Text>
                  <Badge colorScheme="blue">
                    {intentTypeLabels[selectedLog.intent_type as IntentType] || selectedLog.intent_type}
                  </Badge>
                </HStack>
                
                <HStack>
                  <Text fontWeight="bold" w="120px">Método:</Text>
                  <Badge colorScheme={methodColors[selectedLog.method] || 'gray'}>
                    {selectedLog.method?.toUpperCase()}
                  </Badge>
                </HStack>
                
                <Box>
                  <Text fontWeight="bold" mb={2}>Mensagem:</Text>
                  <Code p={3} borderRadius="md" w="full" display="block">
                    {selectedLog.message_text}
                  </Code>
                </Box>
                
                {selectedLog.handler_used && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Handler:</Text>
                    <Code p={3} borderRadius="md" w="full" display="block">
                      {selectedLog.handler_used}
                    </Code>
                  </Box>
                )}
                
                {selectedLog.confidence && (
                  <HStack>
                    <Text fontWeight="bold" w="120px">Confiança:</Text>
                    <Text>{(selectedLog.confidence * 100).toFixed(1)}%</Text>
                  </HStack>
                )}
              </VStack>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button onClick={() => setSelectedLog(null)}>Fechar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default IntentLogsPage;
