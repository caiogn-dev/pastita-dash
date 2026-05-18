/**
 * AccountsPage - Contas WhatsApp (sem Chakra UI)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PowerIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge } from '../../components/common';
import { whatsappService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { WhatsAppAccount } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_VARIANT: Record<string, string> = {
  active: 'success',
  inactive: 'gray',
  pending: 'warning',
  error: 'danger',
};

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, setAccounts, setLoading, isLoading, updateAccount, removeAccount } = useAccountStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    if (!actionMenuId) return;
    const handler = () => setActionMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuId]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await whatsappService.getAccounts();
      setAccounts(response.data?.results || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (account: WhatsAppAccount) => {
    try {
      const updatedRes = account.status === 'active'
        ? await whatsappService.deactivateAccount(account.id)
        : await whatsappService.activateAccount(account.id);
      const updated = updatedRes.data;
      updateAccount({ ...account, status: updated?.status || (account.status === 'active' ? 'inactive' : 'active') });
      toast.success(`Conta ${account.status === 'active' ? 'desativada' : 'ativada'} com sucesso!`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setActionMenuId(null);
  };

  const handleSyncTemplates = async (account: WhatsAppAccount) => {
    try {
      const result = await whatsappService.syncTemplates(account.id);
      toast.success(result.data?.message || 'Templates sincronizados!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setActionMenuId(null);
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    setIsDeleting(true);
    try {
      await whatsappService.deleteAccount(selectedAccount.id);
      removeAccount(selectedAccount.id);
      toast.success('Conta removida com sucesso!');
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fg-primary">Contas WhatsApp</h1>
            <p className="text-sm text-fg-muted mt-0.5">{accounts.length} conta(s) cadastrada(s)</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate('/accounts/new')}>
            Nova Conta
          </Button>
        </div>

        {/* Table */}
        <Card noPadding>
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-fg-muted">Nenhuma conta cadastrada</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/accounts/new')}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Adicionar Conta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary text-left">
                    <th className="px-4 py-3 text-fg-muted font-medium">Nome</th>
                    <th className="px-4 py-3 text-fg-muted font-medium">Phone ID</th>
                    <th className="px-4 py-3 text-fg-muted font-medium">Status</th>
                    <th className="px-4 py-3 text-fg-muted font-medium">Auto Resposta</th>
                    <th className="px-4 py-3 text-fg-muted font-medium">Criado em</th>
                    <th className="px-4 py-3 text-fg-muted font-medium w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-border-primary hover:bg-bg-hover cursor-pointer transition-colors"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-fg-primary">{account.name}</p>
                          <p className="text-xs text-fg-muted">{account.display_phone_number || account.phone_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-fg-muted">{account.phone_number_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[account.status] as any}>{account.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={account.auto_response_enabled ? 'text-green-600 dark:text-green-400 text-sm' : 'text-fg-muted text-sm'}>
                          {account.auto_response_enabled ? 'Ativada' : 'Desativada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {format(new Date(account.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                            aria-label="Ações"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(actionMenuId === account.id ? null : account.id);
                            }}
                          >
                            <EllipsisVerticalIcon className="w-5 h-5 text-fg-muted" />
                          </button>
                          {actionMenuId === account.id && (
                            <div
                              className="absolute right-0 top-8 z-50 bg-bg-card border border-border-primary rounded-lg shadow-lg py-1 min-w-[180px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover text-fg-primary"
                                onClick={() => handleToggleStatus(account)}
                              >
                                <PowerIcon className="w-4 h-4" />
                                {account.status === 'active' ? 'Desativar' : 'Ativar'}
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover text-fg-primary"
                                onClick={() => handleSyncTemplates(account)}
                              >
                                <ArrowPathIcon className="w-4 h-4" />
                                Sincronizar Templates
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover text-fg-primary"
                                onClick={() => { navigate(`/accounts/${account.id}`); setActionMenuId(null); }}
                              >
                                <ChartBarIcon className="w-4 h-4" />
                                Ver Detalhes
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover text-red-600 dark:text-red-400"
                                onClick={() => {
                                  setSelectedAccount(account);
                                  setIsDeleteOpen(true);
                                  setActionMenuId(null);
                                }}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative bg-bg-card border border-border-primary rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-fg-primary">Excluir Conta</h2>
              <button className="p-1 rounded hover:bg-bg-hover" onClick={() => setIsDeleteOpen(false)}>
                <XMarkIcon className="w-5 h-5 text-fg-muted" />
              </button>
            </div>
            <p className="text-fg-secondary mb-6">
              Tem certeza que deseja excluir a conta "{selectedAccount?.name}"?{' '}
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
