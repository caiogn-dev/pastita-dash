/**
 * HandoverRequestsPage - Pending handover requests for human agent takeover
 *
 * Lists requests from bots/agents asking for a human to take over a conversation.
 * Agents (human operators) can approve or reject each request from here.
 *
 * Endpoint: GET/PATCH /api/v1/handover/requests/
 */
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Spinner,
  Stack,
  HStack,
  VStack,
  IconButton,
} from '@chakra-ui/react';
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { handoverService, HandoverRequest } from '../../services/handover';

const priorityColor: Record<HandoverRequest['priority'], string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const statusColor: Record<HandoverRequest['status'], string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  expired: 'gray',
};

export const HandoverRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<HandoverRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await handoverService.getRequests();
      setRequests(data);
    } catch (error) {
      toast.error('Erro ao carregar solicitações de handover');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    // Poll every 30s for new requests
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await handoverService.approveRequest(requestId);
      toast.success('Solicitação aprovada — conversa transferida para atendimento humano');
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r)
      );
    } catch (error) {
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await handoverService.rejectRequest(requestId);
      toast.success('Solicitação rejeitada');
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r)
      );
    } catch (error) {
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <Box p={6} maxW="900px" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" gap={0}>
          <Heading size="lg">Solicitações de Handover</Heading>
          <Text color="fg.muted" fontSize="sm">
            Pedidos de agentes para transferência para atendimento humano
          </Text>
        </VStack>
        <IconButton
          aria-label="Atualizar"
          variant="ghost"
          onClick={loadRequests}
          loading={isLoading}
        >
          <ArrowPathIcon className="w-5 h-5" />
        </IconButton>
      </Flex>

      {isLoading && requests.length === 0 ? (
        <Flex justify="center" py={12}>
          <Spinner size="xl" color="green.500" />
        </Flex>
      ) : (
        <Stack gap={6}>
          {/* Pending requests */}
          <Box>
            <HStack mb={3}>
              <Heading size="sm">Pendentes</Heading>
              {pendingRequests.length > 0 && (
                <Badge colorPalette="yellow" variant="solid" borderRadius="full">
                  {pendingRequests.length}
                </Badge>
              )}
            </HStack>

            {pendingRequests.length === 0 ? (
              <Box
                p={8}
                textAlign="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="border.default"
                borderRadius="xl"
              >
                <Text color="fg.muted">Nenhuma solicitação pendente</Text>
              </Box>
            ) : (
              <Stack gap={3}>
                {pendingRequests.map(req => (
                  <Box
                    key={req.id}
                    p={4}
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    bg="bg.default"
                    boxShadow="sm"
                  >
                    <Flex justify="space-between" align="start">
                      <VStack align="start" gap={1}>
                        <HStack gap={2}>
                          <Text fontWeight="semibold" fontSize="sm">
                            Conversa: <Text as="span" fontFamily="mono" fontSize="xs">{req.conversation}</Text>
                          </Text>
                          <Badge colorPalette={priorityColor[req.priority]} size="sm">
                            {req.priority_display || req.priority}
                          </Badge>
                        </HStack>

                        {req.reason && (
                          <Text fontSize="sm" color="fg.muted">
                            Motivo: {req.reason}
                          </Text>
                        )}

                        <Text fontSize="xs" color="fg.subtle">
                          Solicitado em{' '}
                          {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {req.expires_at && (
                            <> — Expira em {format(new Date(req.expires_at), "HH:mm", { locale: ptBR })}</>
                          )}
                        </Text>
                      </VStack>

                      <HStack gap={2}>
                        <Button
                          size="sm"
                          colorPalette="green"
                          onClick={() => handleApprove(req.id)}
                          loading={processingId === req.id}
                          disabled={processingId !== null && processingId !== req.id}
                        >
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          colorPalette="red"
                          onClick={() => handleReject(req.id)}
                          loading={processingId === req.id}
                          disabled={processingId !== null && processingId !== req.id}
                        >
                          <XMarkIcon className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Resolved requests */}
          {resolvedRequests.length > 0 && (
            <Box>
              <Heading size="sm" mb={3} color="fg.muted">
                Histórico Recente
              </Heading>
              <Stack gap={2}>
                {resolvedRequests.slice(0, 10).map(req => (
                  <Box
                    key={req.id}
                    p={3}
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderRadius="lg"
                    bg="bg.subtle"
                    opacity={0.8}
                  >
                    <Flex justify="space-between" align="center">
                      <HStack gap={2}>
                        <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                          {req.conversation}
                        </Text>
                        <Badge colorPalette={statusColor[req.status]} size="sm" variant="subtle">
                          {req.status_display || req.status}
                        </Badge>
                        <Badge colorPalette={priorityColor[req.priority]} size="sm" variant="subtle">
                          {req.priority_display || req.priority}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="fg.subtle">
                        {format(new Date(req.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </Text>
                    </Flex>
                    {req.reason && (
                      <Text fontSize="xs" color="fg.muted" mt={1}>
                        {req.reason}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default HandoverRequestsPage;
