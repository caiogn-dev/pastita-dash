/**
 * MessengerAccounts - Contas do Messenger (sem Chakra UI)
 */
import React, { useState, useEffect } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon,
  CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { Button, Badge } from '../../components/common';
import { messengerService, MessengerAccount } from '../../services/messenger';
import { useConfirm } from '../../hooks';
import { PageShell, SearchInput, Modal, ModalFooter } from '../../components/ui';

export default function MessengerAccounts() {
  const [ConfirmDialog, confirm] = useConfirm();
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MessengerAccount | null>(null);
  const [formData, setFormData] = useState({ name: '', page_id: '', page_name: '', page_access_token: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await messengerService.getAccounts();
      // Endpoint pagina ({count,results}); ler response.data direto deixava accounts
      // como objeto → accounts.filter(...) quebrava no render.
      const d = response.data as MessengerAccount[] | { results?: MessengerAccount[] };
      setAccounts(Array.isArray(d) ? d : (d.results || []));
      setError(null);
    } catch { setError('Erro ao carregar contas do Messenger'); }
    finally { setLoading(false); }
  };

  const openDialog = (account?: MessengerAccount) => {
    setEditingAccount(account || null);
    setFormData(account
      ? { name: account.name || account.page_name, page_id: account.page_id, page_name: account.page_name, page_access_token: '' }
      : { name: '', page_id: '', page_name: '', page_access_token: '' });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingAccount(null); setFormData({ name: '', page_id: '', page_name: '', page_access_token: '' }); };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (editingAccount) await messengerService.updateAccount(editingAccount.id, formData);
      else await messengerService.createAccount(formData);
      closeDialog();
      loadAccounts();
    } catch { setError('Erro ao salvar conta'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir conta',
      message: 'Excluir esta conta? Esta ação não pode ser desfeita.',
    });
    if (!confirmed) return;
    try { await messengerService.deleteAccount(id); loadAccounts(); }
    catch { setError('Erro ao excluir conta'); }
  };

  const handleVerifyWebhook = async (id: string) => {
    try { await messengerService.verifyWebhook(id); loadAccounts(); }
    catch { setError('Erro ao verificar webhook'); }
  };

  const filtered = accounts.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.page_name?.toLowerCase().includes(q) || a.page_id?.toLowerCase().includes(q);
  });

  return (
    <PageShell
      titulo="Contas do Messenger"
      acoes={<Button onClick={() => openDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>Adicionar Conta</Button>}
      filtros={
          <SearchInput
            className="w-56"
            aria-label="Buscar contas"
            placeholder="Buscar contas…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
      }
    >

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500 text-red-700 dark:text-red-400">
          <XCircleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-16 text-center">
          <ChatBubbleLeftIcon className="w-16 h-16 text-fg-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fg-muted mb-2">Nenhuma conta configurada</h3>
          <p className="text-sm text-fg-muted mb-6">Adicione uma página do Facebook para começar</p>
          <Button onClick={() => openDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>Adicionar Conta</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-6">
          {filtered.map((account) => (
            <div key={account.id} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-fg-primary">{account.page_name}</p>
                  <p className="text-xs text-fg-muted">ID: {account.page_id}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openDialog(account)}
                    aria-label={`Editar conta ${account.page_name}`}
                    title="Editar conta"
                    className="p-1.5 rounded hover:bg-bg-hover text-fg-muted transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    aria-label={`Excluir conta ${account.page_name}`}
                    title="Excluir conta"
                    className="p-1.5 rounded hover:bg-bg-hover text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={account.is_active ? 'success' : 'gray'}>
                  <span className="flex items-center gap-1">
                    {account.is_active ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                    {account.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </Badge>
                <Badge variant={account.webhook_verified ? 'success' : 'warning'}>
                  <span className="flex items-center gap-1">
                    {account.webhook_verified ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                    {account.webhook_verified ? 'Webhook OK' : 'Webhook Pendente'}
                  </span>
                </Badge>
              </div>

              {!account.webhook_verified && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleVerifyWebhook(account.id)}
                  leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                  Verificar Webhook
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {ConfirmDialog}

      {/* Modal */}
      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title={editingAccount ? 'Editar conta' : 'Adicionar conta do Messenger'}
      >
        <div className="flex flex-col gap-4">
          {[
            { key: 'name', label: 'Nome da conta', type: 'text', placeholder: 'Nome para identificar esta conta' },
            { key: 'page_id', label: 'ID da página', type: 'text', placeholder: 'ID da página do Facebook', disabled: !!editingAccount },
            { key: 'page_name', label: 'Nome da página', type: 'text', placeholder: 'Ex.: Loja Oficial' },
            { key: 'page_access_token', label: 'Token de acesso da página', type: 'password', placeholder: 'Token de acesso da página' },
          ].map(({ key, label, type, placeholder, disabled }) => (
            <div key={key}>
              <label
                htmlFor={`messenger-account-${key}`}
                className="mb-1 block text-sm font-medium text-fg-muted-token"
              >
                {label}
              </label>
              <input
                id={`messenger-account-${key}`}
                type={type}
                value={(formData as Record<string, string>)[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full rounded-lg border border-border-token bg-surface px-3 py-2 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={
              !formData.name ||
              !formData.page_id ||
              !formData.page_name ||
              !formData.page_access_token
            }
          >
            Salvar
          </Button>
        </ModalFooter>
      </Modal>
    </PageShell>
  );
}
