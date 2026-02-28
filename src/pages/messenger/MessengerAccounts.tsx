import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  Input,
  Dialog,
  IconButton,
  Badge,
  Separator,
  Flex,
  VStack,
  HStack,
  Grid,
  Field,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { messengerService, MessengerAccount } from '../../services/messenger';

const MotionCard = motion(Card.Root);

export default function MessengerAccounts() {
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MessengerAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    page_id: '',
    page_name: '',
    page_access_token: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await messengerService.getAccounts();
      setAccounts(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Erro ao carregar contas do Messenger');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account?: MessengerAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name || account.page_name,
        page_id: account.page_id,
        page_name: account.page_name,
        page_access_token: '',
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        page_id: '',
        page_name: '',
        page_access_token: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
    setFormData({
      name: '',
      page_id: '',
      page_name: '',
      page_access_token: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (editingAccount) {
        await messengerService.updateAccount(editingAccount.id, formData);
      } else {
        await messengerService.createAccount(formData);
      }
      handleCloseDialog();
      loadAccounts();
    } catch (err) {
      console.error('Error saving account:', err);
      setError('Erro ao salvar conta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    
    try {
      await messengerService.deleteAccount(id);
      loadAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erro ao excluir conta');
    }
  };

  const handleVerifyWebhook = async (id: string) => {
    try {
      await messengerService.verifyWebhook(id);
      loadAccounts();
    } catch (err) {
      console.error('Error verifying webhook:', err);
      setError('Erro ao verificar webhook');
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      acc.page_name?.toLowerCase().includes(query) ||
      acc.page_id?.toLowerCase().includes(query)
    );
  });

  return (
    <Box p={6}>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        mb={6}
      >
        <Card.Header>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack gap={3}>
              <Box p={3} bg="blue.100" borderRadius="xl" color="blue.600">
                <Icon as={ChatBubbleLeftIcon} boxSize={6} />
              </Box>
              <Box>
                <Heading size="lg">Contas do Messenger</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Gerencie suas páginas do Facebook Messenger
                </Text>
              </Box>
            </HStack>
            <HStack gap={2} flexWrap="wrap">
              <Input
                placeholder="Buscar contas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                w="250px"
              />
              <Button onClick={() => handleOpenDialog()}>
                <Icon as={PlusIcon} mr={2} boxSize={4} />
                Adicionar Conta
              </Button>
            </HStack>
          </Flex>
        </Card.Header>
      </MotionCard>

      {error && (
        <Box 
          mb={4} 
          p={4} 
          bg="red.50" 
          color="red.700" 
          borderRadius="lg"
          borderLeft="4px solid"
          borderLeftColor="red.500"
        >
          <HStack gap={2}>
            <Icon as={XCircleIcon} color="red.500" />
            <Text fontWeight="medium">{error}</Text>
          </HStack>
        </Box>
      )}

      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" />
        </Flex>
      ) : filteredAccounts.length === 0 ? (
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card.Body textAlign="center" py={16}>
            <Box color="fg.muted" mb={4}>
              <Icon as={ChatBubbleLeftIcon} boxSize={16} />
            </Box>
            <Heading size="md" color="fg.muted" mb={2}>Nenhuma conta configurada</Heading>
            <Text color="fg.muted" mb={6}>
              Adicione uma página do Facebook para começar a receber mensagens
            </Text>
            <Button onClick={() => handleOpenDialog()} size="lg">
              <Icon as={PlusIcon} mr={2} boxSize={4} />
              Adicionar Conta
            </Button>
          </Card.Body>
        </MotionCard>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {filteredAccounts.map((account, index) => (
            <MotionCard
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              _hover={{ shadow: 'lg' }}
            >
              <Card.Body>
                <Flex justify="space-between" align="flex-start" mb={4}>
                  <Box>
                    <Heading size="sm">{account.page_name}</Heading>
                    <Text fontSize="xs" color="fg.muted">ID: {account.page_id}</Text>
                  </Box>
                  <HStack gap={1}>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(account)}
                      title="Editar"
                    >
                      <Icon as={PencilIcon} boxSize={4} />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(account.id)}
                      title="Excluir"
                    >
                      <Icon as={TrashIcon} boxSize={4} />
                    </IconButton>
                  </HStack>
                </Flex>

                <HStack gap={2} mb={4} flexWrap="wrap">
                  <Badge colorPalette={account.is_active ? 'green' : 'gray'}>
                    <HStack gap={1}>
                      <Icon as={account.is_active ? CheckCircleIcon : XCircleIcon} boxSize={3} />
                      <span>{account.is_active ? 'Ativo' : 'Inativo'}</span>
                    </HStack>
                  </Badge>
                  <Badge colorPalette={account.webhook_verified ? 'green' : 'yellow'}>
                    <HStack gap={1}>
                      <Icon as={account.webhook_verified ? CheckCircleIcon : XCircleIcon} boxSize={3} />
                      <span>{account.webhook_verified ? 'Webhook OK' : 'Webhook Pendente'}</span>
                    </HStack>
                  </Badge>
                </HStack>

                {!account.webhook_verified && (
                  <Button
                    w="full"
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerifyWebhook(account.id)}
                  >
                    <Icon as={ArrowPathIcon} mr={2} boxSize={4} />
                    Verificar Webhook
                  </Button>
                )}
              </Card.Body>
            </MotionCard>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>
                {editingAccount ? 'Editar Conta' : 'Adicionar Conta do Messenger'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>Nome da Conta</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome para identificar esta conta no painel"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Page ID</Field.Label>
                  <Input
                    value={formData.page_id}
                    onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                    disabled={!!editingAccount}
                  />
                </Field.Root>
                
                <Field.Root>
                  <Field.Label>Nome da Página</Field.Label>
                  <Input
                    value={formData.page_name}
                    onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                  />
                </Field.Root>
                
                <Field.Root>
                  <Field.Label>Page Access Token</Field.Label>
                  <Input
                    type="password"
                    value={formData.page_access_token}
                    onChange={(e) => setFormData({ ...formData, page_access_token: e.target.value })}
                    placeholder="Token de acesso da página do Facebook"
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.name || !formData.page_id || !formData.page_name || !formData.page_access_token}
                loading={submitting}
              >
                Salvar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
