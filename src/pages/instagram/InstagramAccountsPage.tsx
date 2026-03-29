/**
 * Instagram Accounts Page
 *
 * Lista contas conectadas e protege a UI contra qualquer variacao
 * de resposta paginada/axios wrapper para evitar crashes por `.filter`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  CameraIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge, Button, Card, Loading, Modal } from '@/components/common';
import { getErrorMessage, normalizePaginatedResponse } from '@/services/api';
import { instagramAccountService, InstagramAccount } from '@/services';

export const InstagramAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<InstagramAccount | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await instagramAccountService.list();
      const nextAccounts = normalizePaginatedResponse<InstagramAccount>(response.data);
      setAccounts(nextAccounts);
      setError(null);
    } catch (err) {
      setAccounts([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts]
  );

  const totalFollowers = useMemo(
    () => activeAccounts.reduce((sum, account) => sum + account.followers_count, 0),
    [activeAccounts]
  );

  const verifiedAccounts = useMemo(
    () => activeAccounts.filter((account) => account.is_verified).length,
    [activeAccounts]
  );

  const totalMedia = useMemo(
    () => activeAccounts.reduce((sum, account) => sum + account.media_count, 0),
    [activeAccounts]
  );

  const handleSync = async (account: InstagramAccount) => {
    setIsSyncing(account.id);
    try {
      await instagramAccountService.sync(account.id);
      toast.success(`Conta @${account.username} sincronizada`);
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteAccount) {
      return;
    }

    try {
      await instagramAccountService.delete(deleteAccount.id);
      toast.success('Conta removida com sucesso');
      setDeleteAccount(null);
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (!clientId) {
      toast.error('VITE_FACEBOOK_APP_ID não configurado. Adicione ao .env.local.');
      return;
    }

    const redirectUri = `${window.location.origin}/instagram/callback`;
    const scope = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_messages',
      'instagram_shopping_tag_product',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_show_list',
    ].join(',');

    const extras = encodeURIComponent(JSON.stringify({ setup: { channel: 'IG_API_ONBOARDING' } }));
    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${clientId}&display=page&extras=${extras}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

    const popup = window.open(authUrl, 'instagram_auth', 'width=600,height=700');
    setShowConnectModal(false);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'INSTAGRAM_OAUTH_SUCCESS') {
        toast.success('Conta Instagram conectada com sucesso!');
        void loadAccounts();
      } else if (event.data?.type === 'INSTAGRAM_OAUTH_ERROR') {
        toast.error(event.data.error || 'Erro ao conectar conta Instagram');
      }
      window.removeEventListener('message', onMessage);
      popup?.close();
    };
    window.addEventListener('message', onMessage);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="py-12">
          <Loading />
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-400">
            Carregando contas...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="py-8 text-center">
            <p className="mb-4 text-red-500">Erro ao carregar contas</p>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">{error}</p>
            <Button onClick={() => void loadAccounts()} variant="primary">
              Tentar novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instagram</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie contas, posts, stories e lives
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void loadAccounts()}
            variant="secondary"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
          >
            Atualizar
          </Button>
          <Button
            onClick={() => setShowConnectModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Conectar Conta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
              <CameraIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Contas Conectadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeAccounts.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/40">
              <ChartBarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total de Seguidores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalFollowers.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/40">
              <CheckCircleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Contas Verificadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {verifiedAccounts}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/40">
              <EyeIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Midias Totais</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalMedia.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Contas Conectadas</h2>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center">
            <CameraIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Nenhuma conta conectada
            </h3>
            <p className="mb-4 text-gray-500">Conecte sua conta do Instagram para comecar</p>
            <Button
              onClick={() => setShowConnectModal(true)}
              variant="primary"
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              Conectar Instagram
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {account.profile_picture_url ? (
                      <img
                        src={account.profile_picture_url}
                        alt={account.username}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                        <span className="text-2xl font-bold text-white">
                          {account.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        @{account.username}
                      </h3>
                      {account.is_verified && (
                        <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                      )}
                      {!account.is_active && <Badge variant="danger">Inativa</Badge>}
                    </div>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {account.biography || 'Sem biografia'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">
                          {account.followers_count.toLocaleString('pt-BR')}
                        </strong>{' '}
                        seguidores
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">
                          {account.follows_count.toLocaleString('pt-BR')}
                        </strong>{' '}
                        seguindo
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">
                          {account.media_count.toLocaleString('pt-BR')}
                        </strong>{' '}
                        publicacoes
                      </span>
                    </div>

                    {account.last_sync_at && (
                      <p className="mt-2 text-xs text-gray-400">
                        Sincronizado{' '}
                        {formatDistanceToNow(new Date(account.last_sync_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => navigate(`/instagram/${account.id}`)}
                      variant="secondary"
                      size="sm"
                      leftIcon={<EyeIcon className="h-4 w-4" />}
                    >
                      Ver
                    </Button>
                    <Button
                      onClick={() => void handleSync(account)}
                      variant="secondary"
                      size="sm"
                      isLoading={isSyncing === account.id}
                      leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                    >
                      Sincronizar
                    </Button>
                    <Button
                      onClick={() => setDeleteAccount(account)}
                      variant="danger"
                      size="sm"
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title="Conectar Conta do Instagram"
        size="md"
      >
        <div className="p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <CameraIcon className="h-10 w-10 text-white" />
            </div>

            <h3 className="mb-2 text-lg font-semibold">Conectar Instagram</h3>

            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Voce sera redirecionado para o Facebook para autorizar o acesso a sua conta do Instagram.
            </p>

            <div className="space-y-3">
              <Button onClick={handleConnect} variant="primary" className="w-full">
                Continuar com Facebook
              </Button>

              <Button
                onClick={() => setShowConnectModal(false)}
                variant="ghost"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
        title="Remover Conta"
        size="sm"
      >
        <div className="p-6">
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Tem certeza que deseja remover a conta <strong>@{deleteAccount?.username}</strong>?
            Esta acao nao pode ser desfeita.
          </p>

          <div className="flex gap-3">
            <Button onClick={() => setDeleteAccount(null)} variant="ghost" className="flex-1">
              Cancelar
            </Button>
            <Button onClick={() => void handleDelete()} variant="danger" className="flex-1">
              Remover
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstagramAccountsPage;
