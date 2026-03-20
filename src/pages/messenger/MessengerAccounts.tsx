/**
 * MessengerAccounts - Contas do Messenger (sem Chakra UI)
 */
import React, { useState, useEffect } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon,
  CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon,
  MagnifyingGlassIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Badge } from '../../components/common';
import { messengerService, MessengerAccount } from '../../services/messenger';

export default function MessengerAccounts() {
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
      setAccounts(response.data || []);
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
    if (!confirm('Excluir esta conta?')) return;
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
    <div className="p-6">
      {/* Header card */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-5 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <ChatBubbleLeftIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fg-primary">Contas do Messenger</h1>
            <p className="text-sm text-fg-muted">Gerencie suas páginas do Facebook Messenger</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              className="pl-9 pr-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
              placeholder="Buscar contas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => openDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>Adicionar Conta</Button>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((account) => (
            <div key={account.id} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-fg-primary">{account.page_name}</p>
                  <p className="text-xs text-fg-muted">ID: {account.page_id}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openDialog(account)} className="p-1.5 rounded hover:bg-bg-hover text-fg-muted transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded hover:bg-bg-hover text-red-500 transition-colors">
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

      {/* Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeDialog} />
          <div className="relative bg-bg-card border border-border-primary rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border-primary">
              <h2 className="text-lg font-semibold text-fg-primary">{editingAccount ? 'Editar Conta' : 'Adicionar Conta do Messenger'}</h2>
              <button onClick={closeDialog} className="p-1 rounded hover:bg-bg-hover"><XMarkIcon className="w-5 h-5 text-fg-muted" /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[
                { key: 'name', label: 'Nome da Conta', type: 'text', placeholder: 'Nome para identificar esta conta' },
                { key: 'page_id', label: 'Page ID', type: 'text', placeholder: 'ID da página do Facebook', disabled: !!editingAccount },
                { key: 'page_name', label: 'Nome da Página', type: 'text', placeholder: 'Ex: Pastita Oficial' },
                { key: 'page_access_token', label: 'Page Access Token', type: 'password', placeholder: 'Token de acesso da página' },
              ].map(({ key, label, type, placeholder, disabled }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-fg-secondary mb-1">{label}</label>
                  <input
                    type={type}
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-primary">
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={!formData.name || !formData.page_id || !formData.page_name || !formData.page_access_token}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
