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
  Tabs,
  Avatar,
  Switch,
  Tooltip,
  Alert,
  Stack,
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
  QuestionMarkCircleIcon,
  LinkIcon,
  QrCodeIcon,
  PowerIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { messagingService, PlatformAccount } from '../../services/messaging';
import { whatsappService } from '../../services/whatsapp';
import { messengerService } from '../../services/messenger';

const MotionCard = motion(Card.Root);
const MotionBox = motion(Box);

// Tipos de plataforma
const PLATFORMS = {
  whatsapp: {
    name: 'WhatsApp',
    color: 'green',
    icon: '📱',
    description: 'Conecte sua conta WhatsApp Business',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Pastita Principal' },
      { name: 'phone_number', label: 'Número de Telefone', type: 'tel', required: true, placeholder: 'Ex: +55 63 99138-6719' },
      { name: 'phone_number_id', label: 'Phone Number ID (Meta)', type: 'text', required: true, placeholder: 'Ex: 123456789012345' },
      { name: 'waba_id', label: 'WABA ID (opcional)', type: 'text', required: false, placeholder: 'Ex: 987654321098765' },
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'Token de acesso da API do WhatsApp' },
      { name: 'webhook_verify_token', label: 'Webhook Verify Token (opcional)', type: 'password', required: false, placeholder: 'Token para verificação do webhook' },
    ],
  },
  messenger: {
    name: 'Messenger',
    color: 'blue',
    icon: '💬',
    description: 'Conecte sua página do Facebook Messenger',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Página Pastita' },
      { name: 'page_id', label: 'Page ID', type: 'text', required: true, placeholder: 'Ex: 123456789012345' },
      { name: 'page_name', label: 'Nome da Página', type: 'text', required: true, placeholder: 'Ex: Pastita Oficial' },
      { name: 'page_access_token', label: 'Page Access Token', type: 'password', required: true, placeholder: 'Token de acesso da página' },
    ],
  },
  instagram: {
    name: 'Instagram',
    color: 'pink',
    icon: '📸',
    description: 'Conecte sua conta do Instagram (em breve)',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Instagram Pastita' },
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'Token de acesso do Instagram' },
    ],
    disabled: true,
  },
};

interface Connection {
  id: string;
  platform: 'whatsapp' | 'messenger' | 'instagram';
  name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error';
  is_active: boolean;
  webhook_verified?: boolean;
  phone_number?: string;
  page_name?: string;
  page_id?: string;
  avatar?: string;
  last_sync?: string;
  unread_count?: number;
  created_at: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      
      // Carrega contas de todas as plataformas
      const [whatsappRes, messengerRes] = await Promise.allSettled([
        whatsappService.getAccounts(),
        messengerService.getAccounts(),
      ]);

      const allConnections: Connection[] = [];

      if (whatsappRes.status === 'fulfilled') {
        const whatsappAccounts = whatsappRes.value.data || [];
        allConnections.push(...whatsappAccounts.map((acc: any) => ({
          ...acc,
          platform: 'whatsapp' as const,
          phone_number: acc.phone_number || acc.display_phone_number,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=25D366&color=fff`,
        })));
      }

      if (messengerRes.status === 'fulfilled') {
        const messengerAccounts = messengerRes.value.data || [];
        allConnections.push(...messengerAccounts.map((acc: any) => ({
          ...acc,
          platform: 'messenger' as const,
          page_name: acc.page_name,
          page_id: acc.page_id,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.page_name)}&background=0084FF&color=fff`,
        })));
      }

      setConnections(allConnections);
      setError(null);
    } catch (err) {
      console.error('Error loading connections:', err);
      setError('Erro ao carregar conexões');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (platform?: string, connection?: Connection) => {
    if (connection) {
      setEditingConnection(connection);
      setSelectedPlatform(connection.platform);
      setFormData({
        name: connection.name || '',
        ...(connection.platform === 'whatsapp' && {
          phone_number: connection.phone_number || '',
        }),
        ...(connection.platform === 'messenger' && {
          page_id: connection.page_id || '',
          page_name: connection.page_name || '',
        }),
      });
    } else if (platform) {
      setEditingConnection(null);
      setSelectedPlatform(platform);
      setFormData({});
    } else {
      setEditingConnection(null);
      setSelectedPlatform(null);
      setFormData({});
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConnection(null);
    setSelectedPlatform(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!selectedPlatform) return;

    try {
      setSubmitting(true);

      const platformConfig = PLATFORMS[selectedPlatform as keyof typeof PLATFORMS];
      const requiredFields = platformConfig.fields.filter(f => f.required).map(f => f.name);
      
      for (const field of requiredFields) {
        if (!formData[field]) {
          toast.error(`Campo obrigatório: ${platformConfig.fields.find(f => f.name === field)?.label}`);
          setSubmitting(false);
          return;
        }
      }

      if (editingConnection) {
        // Atualiza conexão existente
        if (selectedPlatform === 'whatsapp') {
          await whatsappService.updateAccount(editingConnection.id, formData);
        } else if (selectedPlatform === 'messenger') {
          await messengerService.updateAccount(editingConnection.id, formData);
        }
        toast.success('Conexão atualizada com sucesso!');
      } else {
        // Cria nova conexão
        if (selectedPlatform === 'whatsapp') {
          await whatsappService.createAccount(formData);
        } else if (selectedPlatform === 'messenger') {
          await messengerService.createAccount(formData);
        }
        toast.success('Conexão criada com sucesso!');
      }

      handleCloseDialog();
      loadConnections();
    } catch (err: any) {
      console.error('Error saving connection:', err);
      const errorMsg = err.response?.data?.error?.message || 'Erro ao salvar conexão';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (connection: Connection) => {
    if (!confirm(`Tem certeza que deseja excluir a conexão "${connection.name}"?`)) return;

    try {
      if (connection.platform === 'whatsapp') {
        await whatsappService.deleteAccount(connection.id);
      } else if (connection.platform === 'messenger') {
        await messengerService.deleteAccount(connection.id);
      }
      toast.success('Conexão excluída com sucesso!');
      loadConnections();
    } catch (err) {
      console.error('Error deleting connection:', err);
      toast.error('Erro ao excluir conexão');
    }
  };

  const handleToggleActive = async (connection: Connection) => {
    try {
      const newStatus = !connection.is_active;
      
      if (connection.platform === 'whatsapp') {
        if (newStatus) {
          await whatsappService.activateAccount(connection.id);
        } else {
          await whatsappService.deactivateAccount(connection.id);
        }
      } else if (connection.platform === 'messenger') {
        await messengerService.updateAccount(connection.id, { is_active: newStatus });
      }

      toast.success(`Conexão ${newStatus ? 'ativada' : 'desativada'} com sucesso!`);
      loadConnections();
    } catch (err) {
      console.error('Error toggling connection:', err);
      toast.error('Erro ao alterar status da conexão');
    }
  };

  const handleShowQR = async (connection: Connection) => {
    try {
      setSelectedConnection(connection);
      setQrDialogOpen(true);
      
      if (connection.platform === 'whatsapp') {
        const res = await whatsappService.getQRCode(connection.id);
        setQrCode(res.data.qr_code || res.data.qr);
      }
    } catch (err) {
      console.error('Error loading QR:', err);
      toast.error('Erro ao carregar QR Code');
    }
  };

  const handleVerifyWebhook = async (connection: Connection) => {
    try {
      if (connection.platform === 'messenger') {
        await messengerService.verifyWebhook(connection.id);
        toast.success('Webhook verificado com sucesso!');
        loadConnections();
      }
    } catch (err) {
      console.error('Error verifying webhook:', err);
      toast.error('Erro ao verificar webhook');
    }
  };

  const filteredConnections = connections.filter((conn) => {
    // Filtro por tab
    if (activeTab !== 'all' && conn.platform !== activeTab) return false;
    
    // Filtro por busca
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conn.name?.toLowerCase().includes(query) ||
      conn.phone_number?.toLowerCase().includes(query) ||
      conn.page_name?.toLowerCase().includes(query) ||
      conn.page_id?.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'gray';
    switch (status) {
      case 'active':
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string, isActive: boolean) => {
    if (!isActive) return 'Desativado';
    switch (status) {
      case 'active':
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Erro';
      default:
        return 'Inativo';
    }
  };

  return (
    <Box p={6} maxW="1600px" mx="auto">
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        mb={8}
      >
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
          <Box>
            <Heading size="xl" mb={2}>Conexões de Mensagens</Heading>
            <Text color="fg.muted" fontSize="lg">
              Gerencie todas as suas conexões de mensagens em um só lugar
            </Text>
          </Box>
          <HStack gap={3}>
            <Input
              placeholder="Buscar conexões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              w="280px"
              leftIcon={<Icon as={MagnifyingGlassIcon} boxSize={4} />}
            />
            <Button onClick={() => handleOpenDialog()} size="lg" colorScheme="blue">
              <Icon as={PlusIcon} mr={2} boxSize={5} />
              Nova Conexão
            </Button>
          </HStack>
        </Flex>
      </MotionBox>

      {/* Stats Cards */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4} mb={8}>
        <MotionCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg="green.100" borderRadius="xl" color="green.600">
                <Text fontSize="2xl">📱</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">WhatsApp</Text>
                <Heading size="lg">
                  {connections.filter(c => c.platform === 'whatsapp').length}
                </Heading>
              </Box>
            </HStack>
          </Card.Body>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg="blue.100" borderRadius="xl" color="blue.600">
                <Text fontSize="2xl">💬</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Messenger</Text>
                <Heading size="lg">
                  {connections.filter(c => c.platform === 'messenger').length}
                </Heading>
              </Box>
            </HStack>
          </Card.Body>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg="green.500" borderRadius="xl" color="white">
                <Icon as={CheckCircleIcon} boxSize={6} />
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Ativas</Text>
                <Heading size="lg">
                  {connections.filter(c => c.is_active).length}
                </Heading>
              </Box>
            </HStack>
          </Card.Body>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} bg="gray.100" borderRadius="xl" color="gray.600">
                <Icon as={XCircleIcon} boxSize={6} />
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Inativas</Text>
                <Heading size="lg">
                  {connections.filter(c => !c.is_active).length}
                </Heading>
              </Box>
            </HStack>
          </Card.Body>
        </MotionCard>
      </Grid>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} mb={6}>
        <Tabs.List>
          <Tabs.Trigger value="all">
            Todas ({connections.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="whatsapp">
            📱 WhatsApp ({connections.filter(c => c.platform === 'whatsapp').length})
          </Tabs.Trigger>
          <Tabs.Trigger value="messenger">
            💬 Messenger ({connections.filter(c => c.platform === 'messenger').length})
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* Error */}
      {error && (
        <Alert.Root status="error" mb={6}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Erro</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* Loading */}
      {loading ? (
        <Flex justify="center" py={16}>
          <VStack gap={4}>
            <Spinner size="xl" />
            <Text color="fg.muted">Carregando conexões...</Text>
          </VStack>
        </Flex>
      ) : filteredConnections.length === 0 ? (
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card.Body textAlign="center" py={16}>
            <Box color="fg.muted" mb={4}>
              <Icon as={ChatBubbleLeftIcon} boxSize={16} />
            </Box>
            <Heading size="md" color="fg.muted" mb={2}>
              {searchQuery ? 'Nenhuma conexão encontrada' : 'Nenhuma conexão configurada'}
            </Heading>
            <Text color="fg.muted" mb={6} maxW="400px" mx="auto">
              {searchQuery 
                ? 'Tente ajustar sua busca ou filtros'
                : 'Adicione uma conexão de WhatsApp ou Messenger para começar a receber mensagens'
              }
            </Text>
            {!searchQuery && (
              <Button onClick={() => handleOpenDialog()} size="lg">
                <Icon as={PlusIcon} mr={2} boxSize={4} />
                Adicionar Conexão
              </Button>
            )}
          </Card.Body>
        </MotionCard>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          <AnimatePresence>
            {filteredConnections.map((connection, index) => (
              <MotionCard
                key={connection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                _hover={{ shadow: 'xl', transform: 'translateY(-2px)' }}
              >
                <Card.Body>
                  {/* Header */}
                  <Flex justify="space-between" align="flex-start" mb={4}>
                    <HStack gap={3}>
                      <Avatar.Root size="lg">
                        <Avatar.Fallback name={connection.name} />
                        <Avatar.Image src={connection.avatar} />
                      </Avatar.Root>
                      <Box>
                        <Heading size="sm" noOfLines={1}>
                          {connection.name}
                        </Heading>
                        <HStack gap={1} mt={1}>
                          <Text fontSize="xs" color="fg.muted">
                            {PLATFORMS[connection.platform].icon} {PLATFORMS[connection.platform].name}
                          </Text>
                        </HStack>
                      </Box>
                    </HStack>
                    <Switch.Root
                      checked={connection.is_active}
                      onCheckedChange={() => handleToggleActive(connection)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  {/* Status */}
                  <HStack gap={2} mb={4} flexWrap="wrap">
                    <Badge colorPalette={getStatusColor(connection.status, connection.is_active)}>
                      {getStatusLabel(connection.status, connection.is_active)}
                    </Badge>
                    {connection.webhook_verified !== undefined && (
                      <Badge colorPalette={connection.webhook_verified ? 'green' : 'yellow'}>
                        {connection.webhook_verified ? 'Webhook OK' : 'Webhook Pendente'}
                      </Badge>
                    )}
                  </HStack>

                  {/* Info */}
                  <Stack gap={1} mb={4} fontSize="sm">
                    {connection.phone_number && (
                      <Text color="fg.muted">📞 {connection.phone_number}</Text>
                    )}
                    {connection.page_name && (
                      <Text color="fg.muted">📄 {connection.page_name}</Text>
                    )}
                    {connection.page_id && (
                      <Text color="fg.muted" fontSize="xs">ID: {connection.page_id}</Text>
                    )}
                  </Stack>

                  {/* Actions */}
                  <Separator mb={4} />
                  <HStack gap={2} justify="flex-end">
                    {connection.platform === 'whatsapp' && !connection.is_active && (
                      <Tooltip content="Conectar via QR Code">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorPalette="green"
                          onClick={() => handleShowQR(connection)}
                        >
                          <Icon as={QrCodeIcon} boxSize={4} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {connection.platform === 'messenger' && !connection.webhook_verified && (
                      <Tooltip content="Verificar Webhook">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorPalette="blue"
                          onClick={() => handleVerifyWebhook(connection)}
                        >
                          <Icon as={LinkIcon} boxSize={4} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip content="Editar">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(connection.platform, connection)}
                      >
                        <Icon as={PencilIcon} boxSize={4} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Excluir">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(connection)}
                      >
                        <Icon as={TrashIcon} boxSize={4} />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                </Card.Body>
              </MotionCard>
            ))}
          </AnimatePresence>
        </Grid>
      )}

      {/* Dialog - Seleção de Plataforma */}
      <Dialog.Root open={dialogOpen && !selectedPlatform} onOpenChange={(e) => !e.open && handleCloseDialog()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Escolher Plataforma</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton variant="ghost" onClick={handleCloseDialog}>
                  <Icon as={XCircleIcon} boxSize={5} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text mb={6} color="fg.muted">
                Selecione a plataforma de mensagens que deseja conectar:
              </Text>
              <Grid templateColumns="repeat(1, 1fr)" gap={4}>
                {Object.entries(PLATFORMS).map(([key, platform]) => (
                  <MotionBox
                    key={key}
                    whileHover={{ scale: platform.disabled ? 1 : 1.02 }}
                    whileTap={{ scale: platform.disabled ? 1 : 0.98 }}
                  >
                    <Card.Root
                      p={4}
                      cursor={platform.disabled ? 'not-allowed' : 'pointer'}
                      opacity={platform.disabled ? 0.6 : 1}
                      onClick={() => !platform.disabled && handleOpenDialog(key)}
                      borderWidth={2}
                      borderColor="transparent"
                      _hover={!platform.disabled ? { borderColor: `${platform.color}.500` } : {}}
                    >
                      <HStack gap={4}>
                        <Box fontSize="4xl">{platform.icon}</Box>
                        <Box flex={1}>
                          <Heading size="md" mb={1}>
                            {platform.name}
                            {platform.disabled && (
                              <Badge ml={2} colorPalette="gray" size="sm">Em breve</Badge>
                            )}
                          </Heading>
                          <Text fontSize="sm" color="fg.muted">
                            {platform.description}
                          </Text>
                        </Box>
                        <Icon as={PlusIcon} boxSize={5} color="fg.muted" />
                      </HStack>
                    </Card.Root>
                  </MotionBox>
                ))}
              </Grid>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog - Formulário */}
      <Dialog.Root open={dialogOpen && !!selectedPlatform} onOpenChange={(e) => !e.open && handleCloseDialog()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>
                {editingConnection ? 'Editar Conexão' : `Nova Conexão ${PLATFORMS[selectedPlatform as keyof typeof PLATFORMS]?.name}`}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton variant="ghost" onClick={handleCloseDialog}>
                  <Icon as={XCircleIcon} boxSize={5} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {selectedPlatform && (
                <VStack gap={4} align="stretch">
                  {PLATFORMS[selectedPlatform as keyof typeof PLATFORMS].fields.map((field) => (
                    <Field.Root key={field.name} required={field.required}>
                      <Field.Label>
                        {field.label}
                        {field.required && <Text as="span" color="red.500"> *</Text>}
                      </Field.Label>
                      <Input
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        disabled={editingConnection && field.name === 'page_id'}
                      />
                      {field.name.includes('token') && (
                        <Field.HelperText fontSize="xs">
                          O token não será exibido novamente por segurança
                        </Field.HelperText>
                      )}
                    </Field.Root>
                  ))}
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                loading={submitting}
                colorScheme="blue"
              >
                {editingConnection ? 'Salvar Alterações' : 'Criar Conexão'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog - QR Code */}
      <Dialog.Root open={qrDialogOpen} onOpenChange={(e) => setQrDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="sm">
            <Dialog.Header>
              <Dialog.Title>Conectar WhatsApp</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="center" py={4}>
                <Text textAlign="center" color="fg.muted">
                  Escaneie o QR Code com seu WhatsApp para conectar
                </Text>
                {qrCode ? (
                  <Box 
                    p={4} 
                    bg="white" 
                    borderRadius="xl"
                    dangerouslySetInnerHTML={{ __html: qrCode }}
                  />
                ) : (
                  <Spinner size="xl" />
                )}
                <Alert.Root status="info">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description fontSize="sm">
                      Abra o WhatsApp no seu celular, vá em Configurações → Dispositivos Conectados → Conectar um dispositivo
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
