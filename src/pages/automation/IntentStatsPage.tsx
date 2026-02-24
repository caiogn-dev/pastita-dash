import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Button,
  Flex,
} from '@chakra-ui/react';
import {
  ChatIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  RepeatIcon,
} from '@chakra-ui/icons';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';

const methodLabels: Record<string, string> = {
  regex: 'Regex/Handler',
  llm: 'LLM/IA',
  none: 'Nenhum',
  handler: 'Handler',
  automessage: 'AutoMessage',
  fallback: 'Fallback',
};

const methodColors: Record<string, string> = {
  regex: 'green',
  handler: 'green',
  llm: 'purple',
  none: 'gray',
  automessage: 'blue',
  fallback: 'orange',
};

export const IntentStatsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [stats, setStats] = useState<IntentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    loadStats();
  }, [companyId, days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const data = await intentService.getStats(companyId, startDate, endDate);
      setStats(data);
    } catch (err) {
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="green.500" />
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  const totalIntents = stats?.total_intents || 0;
  const handlerRate = totalIntents > 0 
    ? ((stats?.by_method?.handler || 0) / totalIntents * 100).toFixed(1)
    : '0';
  const llmRate = totalIntents > 0
    ? ((stats?.by_method?.llm || 0) / totalIntents * 100).toFixed(1)
    : '0';

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Estatísticas de Intenções</Heading>
            <Text color="gray.500">Análise de processamento de mensagens</Text>
          </VStack>
          
          <HStack spacing={4}>
            <Select 
              value={days} 
              onChange={(e) => setDays(Number(e.target.value))}
              w="150px"
            >
              <option value={1}>Últimas 24h</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
            </Select>
            
            <Button 
              leftIcon={<RepeatIcon />} 
              onClick={loadStats}
              colorScheme="green"
              variant="outline"
            >
              Atualizar
            </Button>
          </HStack>
        </HStack>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
            <CardBody>
              <Stat>
                <StatLabel>Total de Intenções</StatLabel>
                <StatNumber>{totalIntents.toLocaleString()}</StatNumber>
                <StatHelpText>Mensagens processadas</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
            <CardBody>
              <Stat>
                <StatLabel>Taxa Handler</StatLabel>
                <StatNumber color="green.500">{handlerRate}%</StatNumber>
                <Progress value={Number(handlerRate)} colorScheme="green" size="sm" mt={2} />
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
            <CardBody>
              <Stat>
                <StatLabel>Taxa LLM</StatLabel>
                <StatNumber color="purple.500">{llmRate}%</StatNumber>
                <Progress value={Number(llmRate)} colorScheme="purple" size="sm" mt={2} />
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
            <CardBody>
              <Stat>
                <StatLabel>Intenções Únicas</StatLabel>
                <StatNumber>{Object.keys(stats?.by_intent || {}).length}</StatNumber>
                <StatHelpText>Tipos detectados</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Intents Table */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <Heading size="md" mb={6}>Distribuição por Intenção</Heading>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Intenção</Th>
                  <Th>Quantidade</Th>
                  <Th>Percentual</Th>
                  <Th>Visualização</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(stats?.by_intent || {})
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .map(([intent, count]) => {
                    const percentage = totalIntents > 0 
                      ? ((count as number) / totalIntents * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <Tr key={intent}>
                        <Td>
                          <Badge colorScheme="blue">
                            {intentTypeLabels[intent as IntentType] || intent}
                          </Badge>
                        </Td>
                        <Td>{(count as number).toLocaleString()}</Td>
                        <Td>{percentage}%</Td>
                        <Td w="200px">
                          <Progress 
                            value={Number(percentage)} 
                            colorScheme="blue" 
                            size="sm" 
                            borderRadius="full"
                          />
                        </Td>
                      </Tr>
                    );
                  })}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Methods Table */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <Heading size="md" mb={6}>Métodos de Processamento</Heading>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Método</Th>
                  <Th>Quantidade</Th>
                  <Th>Percentual</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(stats?.by_method || {})
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .map(([method, count]) => {
                    const percentage = totalIntents > 0
                      ? ((count as number) / totalIntents * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <Tr key={method}>
                        <Td>
                          <Badge colorScheme={methodColors[method] || 'gray'}>
                            {methodLabels[method] || method}
                          </Badge>
                        </Td>
                        <Td>{(count as number).toLocaleString()}</Td>
                        <Td>{percentage}%</Td>
                        <Td>
                          <Progress 
                            value={Number(percentage)} 
                            colorScheme={methodColors[method] || 'gray'} 
                            size="sm" 
                            borderRadius="full"
                            w="150px"
                          />
                        </Td>
                      </Tr>
                    );
                  })}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default IntentStatsPage;
