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
} from '@chakra-ui/react';
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ChatBubbleIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { messengerService, MessengerAccount } from '../../services/messenger';

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
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="xl">Contas do Messenger</Heading>
        <HStack gap={2}>
          <Input
            placeholder="Buscar contas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w="250px"
          >
            <Input.ElementLeft pointerEvents="none">
              <MagnifyingGlassIcon />
            </Input.ElementLeft>
          </Input>
          <Button onClick={() => handleOpenDialog()}>
            <PlusIcon />
            Adicionar Conta
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Box mb={4} p={3} bg="red.50" color="red.700" borderRadius="md">
          {error}
        </Box>
      )}

      {loading ? (
        <Flex justify="center" py={16}>
          <Text>⏳</Text>
        </Flex>
      ) : filteredAccounts.length === 0 ? (
        <Card.Root>
          <Card.Body textAlign="center" py={16}>
            <Box color="fg.muted" mb={4}><ChatBubbleIcon width="64" height="64" /></Box>
            <Heading size="md" color="fg.muted" mb={2}>Nenhuma conta configurada</Heading>
            <Text color="fg.muted" mb={6}>
              Adicione uma página do Facebook para começar a receber mensagens
            </Text>
            <Button onClick={() => handleOpenDialog()}>
              <PlusIcon />
              Adicionar Conta
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {filteredAccounts.map((account) => (
            <Card.Root key={account.id}>
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
                      <Pencil1Icon />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(account.id)}
                      title="Excluir"
                    >
                      <TrashIcon />
                    </IconButton>
                  </HStack>
                </Flex>

                <HStack gap={2} mb={4}>
                  <Badge colorPalette={account.is_active ? 'green' : 'gray'}>
                    <HStack gap={1}>
                      {account.is_active ? <CheckCircledIcon /> : <CrossCircledIcon />}
                      <span>{account.is_active ? 'Ativo' : 'Inativo'}</span>
                    </HStack>
                  </Badge>
                  <Badge colorPalette={account.webhook_verified ? 'green' : 'yellow'}>
                    <HStack gap={1}>
                      {account.webhook_verified ? <CheckCircledIcon /> : <CrossCircledIcon />}
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
                    <ReloadIcon />
                    Verificar Webhook
                  </Button>
                )}
              </Card.Body>
            </Card.Root>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
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
      </Dialog.Root>
    </Box>
  );
}
