import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Card, Button, StatusBadge, Modal, Input, PageLoading, PageTitle } from '../../components/common';
import { StatCard } from '../../components/ui';
import { whatsappService, getErrorMessage } from '../../services';
import { WhatsAppAccount, MessageTemplate } from '../../types';

export const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [businessProfile, setBusinessProfile] = useState<Record<string, unknown> | null>(null);
  const [messageStats, setMessageStats] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [rotateTokenModal, setRotateTokenModal] = useState(false);
  const [newToken, setNewToken] = useState('');

  useEffect(() => {
    if (id) {
      loadAccount();
    }
  }, [id]);

  const loadAccount = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const accountRes = await whatsappService.getAccount(id);
      setAccount(accountRes.data);

      // Load templates
      const templatesResponse = await whatsappService.getTemplates(id);
      setTemplates(templatesResponse.data?.results || []);

      // Load business profile
      try {
        const profileRes = await whatsappService.getBusinessProfile(id);
        setBusinessProfile(profileRes.data);
      } catch {
        // Profile might not be available
      }

      // Load message stats for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      try {
        const statsRes = await whatsappService.getMessageStats(id, {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });
        setMessageStats(statsRes.data);
      } catch {
        // Stats might not be available
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!account) return;
    setActionLoading('status');
    try {
      const updatedRes = account.status === 'active'
        ? await whatsappService.deactivateAccount(account.id)
        : await whatsappService.activateAccount(account.id);
      const updated = updatedRes.data;
      setAccount(prev => prev ? { ...prev, status: updated?.status || (account.status === 'active' ? 'inactive' : 'active') } : null);
      toast.success(`Conta ${account.status === 'active' ? 'desativada' : 'ativada'} com sucesso!`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncTemplates = async () => {
    if (!account) return;
    setActionLoading('sync');
    try {
      const result = await whatsappService.syncTemplates(account.id);
      toast.success((result.data as { message?: string })?.message || 'Templates sincronizados!');
      loadAccount();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRotateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !newToken) return;
    setActionLoading('rotate');
    try {
      const result = await whatsappService.rotateToken(account.id, newToken);
      toast.success((result.data as { message?: string })?.message || 'Token rotacionado!');
      setRotateTokenModal(false);
      setNewToken('');
      loadAccount();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !account) {
    return <PageLoading />;
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title={account.name}
        subtitle={account.display_phone_number || account.phone_number}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeftIcon className="w-5 h-5" />}
              onClick={() => navigate('/accounts')}
            >
              Voltar
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/accounts/${account.id}/edit`)}
            >
              Editar
            </Button>
          </div>
        }
      />

        {/* Status and Actions */}
        <Card>
          <div className="flex flex-row max-md:flex-col md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={account.status} />
              <span className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Token v{account.token_version}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={account.status === 'active' ? 'secondary' : 'primary'}
                size="sm"
                isLoading={actionLoading === 'status'}
                onClick={handleToggleStatus}
              >
                {account.status === 'active' ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
                isLoading={actionLoading === 'sync'}
                onClick={handleSyncTemplates}
              >
                Sincronizar Templates
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<KeyIcon className="w-4 h-4" />}
                onClick={() => setRotateTokenModal(true)}
              >
                Rotacionar Token
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        {messageStats && (
          <div className="grid grid-cols-4 max-md:grid-cols-1 gap-4">
            <StatCard
              label="Mensagens Enviadas"
              value={(messageStats as { by_status?: Record<string, number> }).by_status?.sent || 0}
            />
            <StatCard
              label="Mensagens Entregues"
              value={(messageStats as { by_status?: Record<string, number> }).by_status?.delivered || 0}
              tone="success"
            />
            <StatCard
              label="Mensagens Lidas"
              value={(messageStats as { by_status?: Record<string, number> }).by_status?.read || 0}
              tone="brand"
            />
            <StatCard
              label="Mensagens Falhas"
              value={(messageStats as { by_status?: Record<string, number> }).by_status?.failed || 0}
              tone="danger"
            />
          </div>
        )}

        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          {/* Account Details */}
          <Card title="Detalhes da Conta">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Phone Number ID</p>
                  <p className="font-mono text-sm">{account.phone_number_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">WABA ID</p>
                  <p className="font-mono text-sm">{account.waba_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Resposta Automática</p>
                  <p className={account.auto_response_enabled ? 'text-green-600' : 'text-gray-400'}>
                    {account.auto_response_enabled ? 'Ativada' : 'Desativada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Handoff Humano</p>
                  <p className={account.human_handoff_enabled ? 'text-green-600' : 'text-gray-400'}>
                    {account.human_handoff_enabled ? 'Ativado' : 'Desativado'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Criado em</p>
                  <p>{format(new Date(account.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Atualizado em</p>
                  <p>{format(new Date(account.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
              {account.default_agent && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Agente IA Padrão</p>
                  <p className="font-medium">{account.default_agent_name || account.default_agent}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Business Profile */}
          <Card title="Perfil do Negócio">
            {businessProfile ? (
              <div className="space-y-4">
                {(businessProfile as Record<string, string>).about && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Sobre</p>
                    <p>{(businessProfile as Record<string, string>).about}</p>
                  </div>
                )}
                {(businessProfile as Record<string, string>).address && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Endereço</p>
                    <p>{(businessProfile as Record<string, string>).address}</p>
                  </div>
                )}
                {(businessProfile as Record<string, string>).email && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Email</p>
                    <p>{(businessProfile as Record<string, string>).email}</p>
                  </div>
                )}
                {(businessProfile as Record<string, string>).websites && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Websites</p>
                    <p>{(businessProfile as Record<string, string>).websites}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Perfil não disponível</p>
            )}
          </Card>
        </div>

        {/* Templates */}
        <Card title={`Templates de Mensagem (${templates.length})`}>
          {templates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] uppercase">
                      Idioma
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] uppercase">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                        {template.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                        {template.language}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                        {template.category}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={template.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] text-center py-8">
              Nenhum template encontrado. Clique em "Sincronizar Templates" para importar.
            </p>
          )}
        </Card>

      {/* Rotate Token Modal */}
      <Modal
        isOpen={rotateTokenModal}
        onClose={() => setRotateTokenModal(false)}
        title="Rotacionar Token de Acesso"
        size="sm"
      >
        <form onSubmit={handleRotateToken} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            Insira o novo token de acesso do WhatsApp Business API. O token atual será substituído.
          </p>
          <Input
            label="Novo Token de Acesso"
            type="password"
            required
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder="EAAxxxxxxx..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRotateTokenModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={actionLoading === 'rotate'}>
              Rotacionar Token
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
