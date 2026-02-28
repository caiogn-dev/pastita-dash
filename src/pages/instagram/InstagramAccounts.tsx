import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  IconButton,
  Avatar,
  Badge,
  Grid,
  Dialog,
  Input,
  Switch,
  Field,
  HStack,
  VStack,
  Flex,
  Separator,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import {
  PlusIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { 
  instagramAccountService, 
  instagramDirectService,
  InstagramAccount,
} from '../../services/instagram';

const MotionCard = motion(Card.Root);

const statusConfig: Record<string, { color: 'green' | 'yellow' | 'red' | 'gray'; icon: React.ElementType; label: string }> = {
  active: { color: 'green', icon: CheckCircleIcon, label: 'Ativo' },
  inactive: { color: 'gray', icon: ExclamationTriangleIcon, label: 'Inativo' },
  pending: { color: 'yellow', icon: ExclamationTriangleIcon, label: 'Pendente' },
  error: { color: 'red', icon: XCircleIcon, label: 'Erro' },
};

interface AccountFormData {
  username: string;
  instagram_business_id?: string;
  facebook_page_id?: string;
  is_active: boolean;
}

export default function InstagramAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    username: '',
    instagram_business_id: '',
    facebook_page_id: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('error');
    
    if (oauthSuccess === 'true') {
      setSuccess('Conta do Instagram conectada com sucesso!');
      loadAccounts();
      setSearchParams({});
    } else if (oauthError) {
      setError(`Erro na autenticação: ${oauthError}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await instagramAccountService.list();
      setAccounts(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Erro ao carregar contas do Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setSaving(true);
      await instagramAccountService.create(formData);
      setDialogOpen(false);
      setFormData({
        username: '',
        instagram_business_id: '',
        facebook_page_id: '',
        is_active: true,
      });
      loadAccounts();
      setSuccess('Conta criada com sucesso!');
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAccount = async (account: InstagramAccount) => {
    try {
      setSyncing(account.id);
      await instagramAccountService.sync(account.id);
      loadAccounts();
      setSuccess('Conta sincronizada com sucesso!');
    } catch (err) {
      console.error('Error syncing account:', err);
      setError('Erro ao sincronizar conta');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteAccount = async (account: InstagramAccount) => {
    if (!confirm(`Deseja realmente excluir a conta @${account.username}?`)) return;
    
    try {
      await instagramAccountService.delete(account.id);
      loadAccounts();
      setSuccess('Conta excluída com sucesso!');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erro ao excluir conta');
    }
  };

  const handleConnectInstagram = () => {
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://backend.pastita.com.br';
    window.location.href = `${backendUrl}/instagram/auth/`;
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      {/* Header */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        mb={6}
      >
        <Card.Header>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack gap={4}>
              <Box 
                p={3} 
                bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" 
                borderRadius="xl"
                color="white"
              >
                <Icon as={UserIcon} boxSize={6} />
              </Box>
              <Box>
                <Heading size="lg">Instagram</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Gerencie suas contas e mensagens do Instagram
                </Text>
              </Box>
            </HStack>
            <HStack gap={2} flexWrap="wrap">
              <Button variant="outline" onClick={loadAccounts}>
                <Icon as={ArrowPathIcon} mr={2} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Icon as={PlusIcon} mr={2} />
                Adicionar Manual
              </Button>
              <Button
                onClick={handleConnectInstagram}
                bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                _hover={{
                  bgGradient: "linear(45deg, #e6683c, #dc2743, #cc2366, #bc1888, #f09433)",
                }}
                color="white"
              >
                <Icon as={UserIcon} mr={2} />
                Conectar via Instagram
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
      
      {success && (
        <Box 
          mb={4} 
          p={4} 
          bg="green.50" 
          color="green.700" 
          borderRadius="lg"
          borderLeft="4px solid"
          borderLeftColor="green.500"
        >
          <HStack gap={2}>
            <Icon as={CheckCircleIcon} color="green.500" />
            <Text fontWeight="medium">{success}</Text>
          </HStack>
        </Box>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <MotionCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card.Body textAlign="center" py={12}>
            <Box 
              p={4} 
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" 
              borderRadius="2xl"
              color="white"
              display="inline-flex"
              mb={4}
              opacity={0.5}
            >
              <Icon as={UserIcon} boxSize={12} />
            </Box>
            <Heading size="md" mb={2}>Nenhuma conta conectada</Heading>
            <Text color="fg.muted" mb={6}>
              Conecte sua conta do Instagram Business para começar a gerenciar mensagens
            </Text>
            <Button
              onClick={() => setDialogOpen(true)}
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
              color="white"
              size="lg"
            >
              <Icon as={PlusIcon} mr={2} />
              Conectar Primeira Conta
            </Button>
          </Card.Body>
        </MotionCard>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {accounts.map((account, index) => {
            const status = statusConfig[account.is_active ? 'active' : 'inactive'] || statusConfig.inactive;
            const StatusIcon = status.icon;
            
            return (
              <MotionCard
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                _hover={{ shadow: 'xl' }}
              >
                <Card.Body>
                  {/* Account Header */}
                  <Flex align="center" gap={3} mb={4}>
                    <Avatar.Root size="xl">
                      <Avatar.Fallback>
                        <Icon as={UserIcon} />
                      </Avatar.Fallback>
                      <Avatar.Image src={account.profile_picture_url} />
                    </Avatar.Root>
                    <Box flex={1}>
                      <Heading size="sm">{account.username}</Heading>
                      <Text fontSize="sm" color="fg.muted">@{account.username}</Text>
                    </Box>
                    <Badge colorPalette={status.color}>
                      <HStack gap={1}>
                        <Icon as={StatusIcon} boxSize={3} />
                        <span>{status.label}</span>
                      </HStack>
                    </Badge>
                  </Flex>

                  <Separator mb={4} />

                  {/* Stats */}
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
                    <HStack>
                      <Box p={2} bg="blue.50" borderRadius="lg" color="blue.500">
                        <Icon as={UserIcon} boxSize={4} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="fg.muted">Seguidores</Text>
                        <Text fontWeight="bold">{account.followers_count?.toLocaleString() || '0'}</Text>
                      </Box>
                    </HStack>
                    <HStack>
                      <Box p={2} bg="purple.50" borderRadius="lg" color="purple.500">
                        <Icon as={ChatBubbleLeftIcon} boxSize={4} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="fg.muted">Publicações</Text>
                        <Text fontWeight="bold">{account.media_count?.toLocaleString() || '0'}</Text>
                      </Box>
                    </HStack>
                  </Grid>

                  {/* Info */}
                  <Box mb={4}>
                    <Text fontSize="xs" color="fg.muted">
                      Seguindo: {account.follows_count?.toLocaleString() || '0'}
                    </Text>
                    {account.last_sync_at && (
                      <Text fontSize="xs" color="fg.muted">
                        Última sincronização: {new Date(account.last_sync_at).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                  </Box>

                  {/* Features */}
                  <HStack gap={2} flexWrap="wrap" mb={4}>
                    {account.is_verified && (
                      <Badge colorPalette="blue" variant="outline">Verificado</Badge>
                    )}
                    {account.is_active && (
                      <Badge colorPalette="green" variant="outline">Ativo</Badge>
                    )}
                  </HStack>

                  {/* Actions */}
                  <Flex justify="space-between">
                    <HStack>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleSyncAccount(account)}
                        disabled={syncing === account.id}
                        title="Sincronizar Conta"
                      >
                        {syncing === account.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Icon as={ArrowPathIcon} boxSize={4} />
                        )}
                      </IconButton>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSelectedAccount(account)}
                        title="Configurações"
                      >
                        <Icon as={Cog6ToothIcon} boxSize={4} />
                      </IconButton>
                    </HStack>
                    <IconButton
                      size="sm"
                      colorPalette="red"
                      variant="ghost"
                      onClick={() => handleDeleteAccount(account)}
                      title="Excluir"
                    >
                      <Icon as={TrashIcon} boxSize={4} />
                    </IconButton>
                  </Flex>
                </Card.Body>
              </MotionCard>
            );
          })}
        </Grid>
      )}

      {/* Create Account Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <HStack gap={2}>
                <Box 
                  p={2} 
                  bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" 
                  borderRadius="lg"
                  color="white"
                >
                  <Icon as={UserIcon} boxSize={5} />
                </Box>
                <Dialog.Title>Conectar Conta do Instagram</Dialog.Title>
              </HStack>
            </Dialog.Header>
            <Dialog.Body>
              <Box 
                mb={4} 
                p={3} 
                bg="blue.50" 
                color="blue.700" 
                borderRadius="md"
                borderLeft="4px solid"
                borderLeftColor="blue.500"
              >
                <Text fontSize="sm">
                  Para conectar sua conta, você precisa ter uma conta Instagram Business conectada a uma Página do Facebook.
                </Text>
              </Box>
              
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>Username</Field.Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="@seuusuario"
                  />
                </Field.Root>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Field.Root>
                    <Field.Label>Instagram Business ID</Field.Label>
                    <Input
                      value={formData.instagram_business_id}
                      onChange={(e) => setFormData({ ...formData, instagram_business_id: e.target.value })}
                      placeholder="ID da conta Instagram"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Facebook Page ID</Field.Label>
                    <Input
                      value={formData.facebook_page_id}
                      onChange={(e) => setFormData({ ...formData, facebook_page_id: e.target.value })}
                      placeholder="ID da página do Facebook"
                    />
                  </Field.Root>
                </Grid>
                
                <Field.Root>
                  <HStack>
                    <Switch.Root
                      checked={formData.is_active}
                      onCheckedChange={(e) => setFormData({ ...formData, is_active: e.checked })}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                    <Field.Label mb={0}>Conta Ativa</Field.Label>
                  </HStack>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreateAccount}
                disabled={saving || !formData.username}
                loading={saving}
                bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                color="white"
              >
                {saving ? 'Salvando...' : 'Conectar'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
