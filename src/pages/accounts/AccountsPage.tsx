/**
 * AccountsPage - Contas WhatsApp (sem Chakra UI)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  PowerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Badge, Modal } from '../../components/common';
import { whatsappService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { WhatsAppAccount } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ACCOUNT_STATUS_LABELS } from '../../utils/rotulosDeEstado';
import { PageShell, Tabela, RowActions } from '../../components/ui';

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
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

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
  };

  const handleSyncTemplates = async (account: WhatsAppAccount) => {
    try {
      const result = await whatsappService.syncTemplates(account.id);
      toast.success(result.data?.message || 'Templates sincronizados!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
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
    <PageShell
      titulo="Contas de WhatsApp"
      acoes={
        <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate('/accounts/new')}>
          Nova Conta
        </Button>
      }
    >

      <Tabela<WhatsAppAccount>
        itens={accounts}
        chave={(c) => c.id}
        rotuloDaLinha={(c) => `Abrir conta ${c.name}`}
        onAbrir={(c) => navigate(`/accounts/${c.id}`)}
        carregando={isLoading}
        vazio={{
          titulo: 'Nenhuma conta cadastrada',
          descricao: 'Conecte um número de WhatsApp para o robô poder atender.',
          acao: (
            <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate('/accounts/new')}>
              Nova Conta
            </Button>
          ),
        }}
        colunas={[
          {
            chave: 'nome',
            cabecalho: 'Nome',
            render: (c) => (
              <div className="min-w-0">
                <p className="font-medium text-fg-token">{c.name}</p>
                <p className="text-xs text-fg-muted-token">
                  {c.display_phone_number || c.phone_number}
                </p>
              </div>
            ),
          },
          {
            chave: 'phone_id',
            cabecalho: 'ID do número',
            soNoDesktop: true,
            render: (c) => (
              <span className="font-mono text-xs text-fg-muted-token">{c.phone_number_id}</span>
            ),
          },
          {
            chave: 'status',
            cabecalho: 'Status',
            render: (c) => (
              <Badge variant={STATUS_VARIANT[c.status] as never}>
                {ACCOUNT_STATUS_LABELS[c.status] ?? c.status}
              </Badge>
            ),
          },
          {
            chave: 'auto',
            cabecalho: 'Resposta automática',
            render: (c) => (
              <span
                className={
                  c.auto_response_enabled
                    ? 'text-sm text-[var(--success)]'
                    : 'text-sm text-fg-muted-token'
                }
              >
                {c.auto_response_enabled ? 'Ativada' : 'Desativada'}
              </span>
            ),
          },
          {
            chave: 'criado',
            cabecalho: 'Criado em',
            soNoDesktop: true,
            render: (c) => format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR }),
          },
          {
            chave: 'acoes',
            cabecalho: 'Ações',
            alinhamento: 'direita',
            render: (c) => (
              // Esta página desenhava o próprio menu kebab — o terceiro do
              // painel, com o próprio z-index, o próprio fechar-ao-clicar-fora
              // (que não tinha) e o próprio vermelho do destrutivo.
              <RowActions
                rotulo={`Ações da conta ${c.name}`}
                acoes={[
                  {
                    rotulo: c.status === 'active' ? 'Desativar' : 'Ativar',
                    icone: <PowerIcon className="w-4 h-4" />,
                    onClick: () => handleToggleStatus(c),
                  },
                  {
                    rotulo: 'Sincronizar templates',
                    icone: <ArrowPathIcon className="w-4 h-4" />,
                    onClick: () => handleSyncTemplates(c),
                  },
                  {
                    rotulo: 'Ver detalhes',
                    icone: <ChartBarIcon className="w-4 h-4" />,
                    onClick: () => navigate(`/accounts/${c.id}`),
                  },
                  {
                    rotulo: 'Excluir',
                    icone: <TrashIcon className="w-4 h-4" />,
                    destrutiva: true,
                    onClick: () => {
                      setSelectedAccount(c);
                      setIsDeleteOpen(true);
                    },
                  },
                ]}
              />
            ),
          },
        ]}
      />

      {/* Delete Modal */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        size="sm"
        title="Excluir Conta"
      >
        <p className="text-fg-muted-token mb-6">
          Tem certeza que deseja excluir a conta "{selectedAccount?.name}"?{' '}
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Excluir</Button>
        </div>
      </Modal>
    </PageShell>
  );
};

export default AccountsPage;
