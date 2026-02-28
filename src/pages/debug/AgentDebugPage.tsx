import React, { useState } from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  Input,
  Badge,
  Separator,
  Flex,
  VStack,
  HStack,
  Field,
  Spinner,
  Icon,
  Grid,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  CpuChipIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import api from '@/services/api';

interface DebugResult {
  timestamp: string;
  conversation?: {
    id: string;
    status: string;
  };
  account?: {
    id: string;
    phone_number: string;
    has_default_agent: boolean;
  };
  agent?: {
    id: string;
    name: string;
    is_active: boolean;
    model: string;
  };
  handover?: {
    id: string;
    status: string;
    assigned_to: string | null;
  } | null;
  checks: {
    agent_active?: boolean;
    handover_bot_mode?: boolean;
    agent_error?: string;
  };
  agent_would_respond: boolean;
  recommendation: string;
}

const MotionCard = motion(Card.Root);

export default function AgentDebugPage() {
  const [conversationId, setConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!conversationId.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/debug/agent-status/?conversation_id=${conversationId}`);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao verificar status');
    } finally {
      setLoading(false);
    }
  };

  const forceHandover = async (target: 'bot' | 'human') => {
    if (!conversationId.trim()) return;
    
    try {
      setLoading(true);
      await api.post(`/conversations/${conversationId}/force-handover/`, {
        target,
        reason: 'Manual override from debug page'
      });
      await checkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao transferir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        mb={6}
      >
        <Card.Header>
          <HStack gap={3}>
            <Box p={2} bg="blue.100" borderRadius="lg" color="blue.600">
              <Icon as={CpuChipIcon} boxSize={6} />
            </Box>
            <Box>
              <Heading size="lg">Diagnóstico do Agente AI</Heading>
              <Text color="fg.muted" fontSize="sm">
                Verifique o status e controle o modo de operação do agente
              </Text>
            </Box>
          </HStack>
        </Card.Header>
      </MotionCard>

      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        mb={6}
      >
        <Card.Header>
          <Heading size="md">Verificar Status</Heading>
        </Card.Header>
        <Card.Body>
          <Flex gap={4} mb={4} direction={{ base: 'column', sm: 'row' }}>
            <Field.Root flex={1}>
              <Field.Label>ID da Conversa</Field.Label>
              <Input
                placeholder="Digite o ID da conversa..."
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkStatus()}
              />
            </Field.Root>
            <Button
              onClick={checkStatus}
              disabled={loading || !conversationId.trim()}
              loading={loading}
              loadingText="Verificando..."
              alignSelf={{ base: 'stretch', sm: 'flex-end' }}
              minW="140px"
            >
              <Icon as={MagnifyingGlassIcon} mr={2} />
              Verificar
            </Button>
          </Flex>

          {error && (
            <Box 
              p={4} 
              bg="red.50" 
              color="red.700" 
              borderRadius="lg"
              borderLeft="4px solid"
              borderLeftColor="red.500"
            >
              <HStack gap={2}>
                <Icon as={ExclamationTriangleIcon} color="red.500" />
                <Text fontWeight="medium">{error}</Text>
              </HStack>
            </Box>
          )}
        </Card.Body>
      </MotionCard>

      {result && (
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card.Header>
            <Heading size="md">Resultado do Diagnóstico</Heading>
            <Text fontSize="sm" color="fg.muted">
              {new Date(result.timestamp).toLocaleString('pt-BR')}
            </Text>
          </Card.Header>
          <Card.Body>
            {/* Status Geral */}
            <Box 
              mb={6} 
              p={6} 
              borderRadius="xl"
              bg={result.agent_would_respond ? 'red.50' : 'green.50'}
              border="2px solid"
              borderColor={result.agent_would_respond ? 'red.200' : 'green.200'}
            >
              <VStack align="center" gap={3}>
                <Badge 
                  size="lg" 
                  colorPalette={result.agent_would_respond ? 'red' : 'green'}
                  px={4}
                  py={2}
                  fontSize="md"
                  borderRadius="full"
                >
                  <HStack gap={2}>
                    <Icon 
                      as={result.agent_would_respond ? ExclamationTriangleIcon : CheckCircleIcon} 
                      boxSize={5} 
                    />
                    <span>
                      {result.agent_would_respond ? 'AGENTE ESTÁ RESPONDENDO' : 'AGENTE NÃO RESPONDE'}
                    </span>
                  </HStack>
                </Badge>
                <Text color="fg.muted" textAlign="center" maxW="600px">
                  {result.recommendation}
                </Text>
              </VStack>
            </Box>

            <Separator mb={6} />

            {/* Checks */}
            <Box mb={6}>
              <Text fontWeight="semibold" mb={3} fontSize="lg">Verificações</Text>
              <HStack gap={3} flexWrap="wrap">
                <Badge 
                  size="lg" 
                  colorPalette={result.checks.agent_active ? 'green' : 'red'}
                  variant="subtle"
                  px={3}
                  py={1}
                >
                  <HStack gap={1}>
                    <Icon 
                      as={result.checks.agent_active ? CheckCircleIcon : ExclamationTriangleIcon} 
                      boxSize={4} 
                    />
                    <span>{result.checks.agent_active ? 'Agente Ativo' : 'Agente Inativo'}</span>
                  </HStack>
                </Badge>
                <Badge 
                  size="lg" 
                  colorPalette={result.checks.handover_bot_mode ? 'green' : 'yellow'}
                  variant="subtle"
                  px={3}
                  py={1}
                >
                  <HStack gap={1}>
                    <Icon 
                      as={result.checks.handover_bot_mode ? CheckCircleIcon : UserIcon} 
                      boxSize={4} 
                    />
                    <span>{result.checks.handover_bot_mode ? 'Modo Bot' : 'Modo Humano'}</span>
                  </HStack>
                </Badge>
              </HStack>
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} mb={6}>
              {/* Agent Info */}
              {result.agent && (
                <Box 
                  p={4} 
                  bg="bg.subtle" 
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <Text fontWeight="semibold" mb={3} fontSize="lg">Informações do Agente</Text>
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">Nome:</Text>
                      <Text fontWeight="medium">{result.agent.name}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">Status:</Text>
                      <Badge colorPalette={result.agent.is_active ? 'green' : 'red'} size="sm">
                        {result.agent.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">Modelo:</Text>
                      <Text fontSize="sm" fontFamily="mono" bg="bg.muted" px={2} py={0.5} borderRadius="md">
                        {result.agent.model}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Handover Info */}
              <Box 
                p={4} 
                bg="bg.subtle" 
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
              >
                <Text fontWeight="semibold" mb={3} fontSize="lg">Handover</Text>
                {result.handover ? (
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">Status:</Text>
                      <Badge colorPalette="blue" size="sm">{result.handover.status}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">Atribuído a:</Text>
                      <Text fontSize="sm">
                        {result.handover.assigned_to || (
                          <Text as="span" color="fg.muted" fontStyle="italic">Ninguém</Text>
                        )}
                      </Text>
                    </HStack>
                  </VStack>
                ) : (
                  <Text color="fg.muted" fontSize="sm">
                    Sem registro de handover (assume modo bot)
                  </Text>
                )}
              </Box>
            </Grid>

            <Separator mb={6} />

            {/* Ações */}
            <Box>
              <Text fontWeight="semibold" mb={3} fontSize="lg">Ações</Text>
              <HStack gap={3} flexWrap="wrap">
                <Button
                  variant="outline"
                  colorPalette="blue"
                  onClick={() => forceHandover('bot')}
                  disabled={loading}
                  size="lg"
                >
                  <Icon as={CpuChipIcon} mr={2} />
                  Forçar Modo Bot
                </Button>
                <Button
                  variant="outline"
                  colorPalette="green"
                  onClick={() => forceHandover('human')}
                  disabled={loading}
                  size="lg"
                >
                  <Icon as={UserIcon} mr={2} />
                  Forçar Modo Humano
                </Button>
              </HStack>
            </Box>
          </Card.Body>
        </MotionCard>
      )}
    </Box>
  );
}
