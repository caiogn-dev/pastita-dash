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
  createListCollection,
} from '@chakra-ui/react';
import {
  InstagramLogoIcon,
  PlusIcon,
  ReloadIcon,
  GearIcon,
  TrashIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
  ChatBubbleIcon,
  PersonIcon,
  LockClosedIcon,
} from '@radix-ui/react-icons';
import { instagramService, InstagramAccount, CreateInstagramAccount, InstagramAccountStats } from '../../services/instagram';

const statusConfig: Record<string, { color: 'green' | 'yellow' | 'red' | 'gray'; icon: React.ReactNode; label: string }> = {
  active: { color: 'green', icon: <CheckCircledIcon />, label: 'Ativo' },
  inactive: { color: 'gray', icon: <ExclamationTriangleIcon />, label: 'Inativo' },
  pending: { color: 'yellow', icon: <ExclamationTriangleIcon />, label: 'Pendente' },
  suspended: { color: 'red', icon: <CrossCircledIcon />, label: 'Suspenso' },
  expired: { color: 'red', icon: <CrossCircledIcon />, label: 'Token Expirado' },
};

export default function InstagramAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [stats, setStats] = useState<Record<string, InstagramAccountStats>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreateInstagramAccount>>({
    name: '',
    instagram_account_id: '',
    instagram_user_id: '',
    facebook_page_id: '',
    username: '',
    app_id: '955411496814093',
    app_secret: '',
    access_token: '',
    webhook_verify_token: 'pastita-ig-verify',
    messaging_enabled: true,
    auto_response_enabled: false,
  });
  const [saving, setSaving] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('error');
    const oauthData = searchParams.get('data');
    
    if (oauthSuccess === 'true' && oauthData) {
      try {
        // Decode base64url data from OAuth callback (replace URL-safe chars)
        const base64 = oauthData.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
        const decodedData = JSON.parse(atob(padded));
        console.log('OAuth data received:', decodedData);
        
        // Pre-fill form with OAuth data
        setFormData(prev => ({
          ...prev,
          name: decodedData.username || '',
          instagram_account_id: decodedData.instagram_account_id || decodedData.instagram_user_id || '',
          instagram_user_id: decodedData.instagram_user_id || '',
          username: decodedData.username || '',
          access_token: decodedData.access_token || '',
        }));
        
        setSuccess(`Conta @${decodedData.username} autorizada! Complete o cadastro abaixo.`);
        setDialogOpen(true);
        
        // Clear URL params
        setSearchParams({});
      } catch (err) {
        console.error('Error parsing OAuth data:', err);
        setError('Erro ao processar dados de autenticação');
        setSearchParams({});
      }
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
      const response = await instagramService.getAccounts();
      setAccounts(response.data?.results || []);
      
      // Load stats for each account
      const statsPromises = (response.data?.results || []).map(async (account: InstagramAccount) => {
        try {
          const statsRes = await instagramService.getAccountStats(account.id);
          return { id: account.id, stats: statsRes.data };
        } catch {
          return { id: account.id, stats: null };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, InstagramAccountStats> = {};
      statsResults.forEach(({ id, stats: accountStats }) => {
        if (accountStats) statsMap[id] = accountStats;
      });
      setStats(statsMap);
      
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
      await instagramService.createAccount(formData as CreateInstagramAccount);
      setDialogOpen(false);
      setFormData({
        name: '',
        instagram_account_id: '',
        instagram_user_id: '',
        facebook_page_id: '',
        username: '',
        app_id: '955411496814093',
        app_secret: '',
        access_token: '',
        webhook_verify_token: 'pastita-ig-verify',
        messaging_enabled: true,
        auto_response_enabled: false,
      });
      loadAccounts();
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshToken = async (account: InstagramAccount) => {
    try {
      await instagramService.refreshToken(account.id);
      loadAccounts();
    } catch (err) {
      console.error('Error refreshing token:', err);
      setError('Erro ao atualizar token');
    }
  };

  const handleSyncProfile = async (account: InstagramAccount) => {
    try {
      await instagramService.syncProfile(account.id);
      loadAccounts();
    } catch (err) {
      console.error('Error syncing profile:', err);
      setError('Erro ao sincronizar perfil');
    }
  };

  const handleDeleteAccount = async (account: InstagramAccount) => {
    if (!confirm(`Deseja realmente excluir a conta @${account.username}?`)) return;
    
    try {
      await instagramService.deleteAccount(account.id);
      loadAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erro ao excluir conta');
    }
  };

  const handleSyncConversations = async (account: InstagramAccount) => {
    try {
      setSyncing(account.id);
      const result = await instagramService.syncConversations(account.id);
      setSuccess(`Sincronizado: ${result.data?.count || 0} conversas encontradas`);
      loadAccounts();
    } catch (err) {
      console.error('Error syncing conversations:', err);
      setError('Erro ao sincronizar conversas');
    } finally {
      setSyncing(null);
    }
  };

  const handleConnectInstagram = () => {
    // Redirect to Instagram OAuth via backend endpoint
    // Using short URI: /ig/start which handles all OAuth params
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://backend.pastita.com.br';
    window.location.href = `${backendUrl}/ig/start`;
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Box animation="spin 1s linear infinite">⏳</Box>
      </Flex>
    );
  }

  return (
    <Box p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <HStack gap={4}>
          <Box color="#E4405F" fontSize="40px">
            <InstagramLogoIcon width="40" height="40" />
          </Box>
          <Box>
            <Heading size="lg">Instagram</Heading>
            <Text color="fg.muted" fontSize="sm">
              Gerencie suas contas e mensagens do Instagram
            </Text>
          </Box>
        </HStack>
        <HStack gap={2}>
          <Button variant="outline" onClick={loadAccounts}>
            <ReloadIcon />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <PlusIcon />
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
            <InstagramLogoIcon />
            Conectar via Instagram
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Box mb={4} p={3} bg="red.50" color="red.700" borderRadius="md">
          {error}
        </Box>
      )}
      
      {success && (
        <Box mb={4} p={3} bg="green.50" color="green.700" borderRadius="md">
          {success}
        </Box>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card.Root>
          <Card.Body textAlign="center" py={12}>
            <Box color="#E4405F" fontSize="80px" opacity={0.5} mb={4}>
              <InstagramLogoIcon width="80" height="80" />
            </Box>
            <Heading size="md" mb={2}>Nenhuma conta conectada</Heading>
            <Text color="fg.muted" mb={6}>
              Conecte sua conta do Instagram Business para começar a gerenciar mensagens
            </Text>
            <Button
              onClick={() => setDialogOpen(true)}
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
              color="white"
            >
              <PlusIcon />
              Conectar Primeira Conta
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {accounts.map((account) => {
            const status = statusConfig[account.status] || statusConfig.inactive;
            const accountStats = stats[account.id];
            
            return (
              <Card.Root key={account.id} _hover={{ shadow: 'lg' }} transition="all 0.2s">
                <Card.Body>
                  {/* Account Header */}
                  <Flex align="center" gap={3} mb={4}>
                    <Avatar.Root size="xl">
                      <Avatar.Fallback><InstagramLogoIcon /></Avatar.Fallback>
                      <Avatar.Image src={account.profile_picture_url} />
                    </Avatar.Root>
                    <Box flex={1}>
                      <Heading size="sm">{account.name}</Heading>
                      <Text fontSize="sm" color="fg.muted">@{account.username}</Text>
                    </Box>
                    <Badge colorPalette={status.color}>
                      <HStack gap={1}>
                        {status.icon}
                        <span>{status.label}</span>
                      </HStack>
                    </Badge>
                  </Flex>

                  <Separator mb={4} />

                  {/* Stats */}
                  {accountStats && (
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
                      <HStack>
                        <PersonIcon />
                        <Box>
                          <Text fontSize="xs" color="fg.muted">Conversas</Text>
                          <Text fontWeight="bold">{accountStats.active_conversations}</Text>
                        </Box>
                      </HStack>
                      <HStack>
                        <ChatBubbleIcon />
                        <Box>
                          <Text fontSize="xs" color="fg.muted">Mensagens</Text>
                          <Text fontWeight="bold">{accountStats.total_messages}</Text>
                        </Box>
                      </HStack>
                    </Grid>
                  )}

                  {/* Info */}
                  <Box mb={4}>
                    <Text fontSize="xs" color="fg.muted">
                      Seguidores: {account.followers_count?.toLocaleString() || 'N/A'}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Token: {account.masked_token}
                    </Text>
                    {account.token_expires_at && (
                      <Text fontSize="xs" color="fg.muted">
                        Expira: {new Date(account.token_expires_at).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                  </Box>

                  {/* Features */}
                  <HStack gap={2} flexWrap="wrap" mb={4}>
                    {account.messaging_enabled && (
                      <Badge colorPalette="blue" variant="outline">Mensagens</Badge>
                    )}
                    {account.auto_response_enabled && (
                      <Badge colorPalette="purple" variant="outline">Auto-resposta</Badge>
                    )}
                  </HStack>

                  {/* Actions */}
                  <Flex justify="space-between">
                    <HStack>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleSyncConversations(account)}
                        disabled={syncing === account.id}
                        title="Sincronizar Conversas"
                      >
                        {syncing === account.id ? '⏳' : '🔄'}
                      </IconButton>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleSyncProfile(account)}
                        title="Sincronizar Perfil"
                      >
                        <ReloadIcon />
                      </IconButton>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleRefreshToken(account)}
                        title="Atualizar Token"
                      >
                        <LockClosedIcon />
                      </IconButton>
                      <IconButton 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSelectedAccount(account)}
                        title="Configurações"
                      >
                        <GearIcon />
                      </IconButton>
                    </HStack>
                    <IconButton
                      size="sm"
                      colorPalette="red"
                      variant="ghost"
                      onClick={() => handleDeleteAccount(account)}
                      title="Excluir"
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Card.Body>
              </Card.Root>
            );
          })}
        </Grid>
      )}

      {/* Create Account Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Dialog.Content maxW="md">
          <Dialog.Header>
            <HStack gap={2}>
              <Box color="#E4405F"><InstagramLogoIcon /></Box>
              <Dialog.Title>Conectar Conta do Instagram</Dialog.Title>
            </HStack>
          </Dialog.Header>
          <Dialog.Body>
            <Box mb={4} p={3} bg="blue.50" color="blue.700" borderRadius="md">
              Para conectar sua conta, você precisa ter uma conta Instagram Business conectada a uma Página do Facebook e um App configurado no Meta Developer Console.
            </Box>
            
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Nome da Conta</Field.Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pastita Instagram"
                />
              </Field.Root>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Field.Root>
                  <Field.Label>Username</Field.Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="@seuusuario"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Instagram Account ID</Field.Label>
                  <Input
                    value={formData.instagram_account_id}
                    onChange={(e) => setFormData({ ...formData, instagram_account_id: e.target.value })}
                    placeholder="ID da conta Instagram"
                  />
                </Field.Root>
              </Grid>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Field.Root>
                  <Field.Label>Instagram User ID</Field.Label>
                  <Input
                    value={formData.instagram_user_id}
                    onChange={(e) => setFormData({ ...formData, instagram_user_id: e.target.value })}
                    placeholder="ID do usuário Instagram"
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
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Field.Root>
                  <Field.Label>App ID</Field.Label>
                  <Input
                    value={formData.app_id}
                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                    placeholder="ID do App no Meta"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>App Secret</Field.Label>
                  <Input
                    type="password"
                    value={formData.app_secret}
                    onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                    placeholder="Secret do App"
                  />
                </Field.Root>
              </Grid>
              
              <Field.Root>
                <Field.Label>Access Token</Field.Label>
                <Input
                  as="textarea"
                  rows={3}
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder="Token de acesso de longa duração"
                />
              </Field.Root>
              
              <Field.Root>
                <HStack>
                  <Switch
                    checked={formData.messaging_enabled}
                    onCheckedChange={(e) => setFormData({ ...formData, messaging_enabled: e.checked })}
                  />
                  <Field.Label mb={0}>Habilitar Mensagens</Field.Label>
                </HStack>
              </Field.Root>
              
              <Field.Root>
                <HStack>
                  <Switch
                    checked={formData.auto_response_enabled}
                    onCheckedChange={(e) => setFormData({ ...formData, auto_response_enabled: e.checked })}
                  />
                  <Field.Label mb={0}>Habilitar Auto-resposta</Field.Label>
                </HStack>
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateAccount}
              disabled={saving || !formData.name || !formData.instagram_account_id || !formData.access_token}
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
              color="white"
            >
              {saving ? '⏳' : 'Conectar'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
