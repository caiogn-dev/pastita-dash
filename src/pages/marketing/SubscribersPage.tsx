import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Card, Modal, Loading } from '../../components/common';
import { useStore } from '../../hooks';
import { marketingService, Subscriber } from '../../services/marketingService';
import { useStoreContextStore } from '../../stores/storeContextStore';
import logger from '../../services/logger';

interface NewSubscriber {
  email: string;
  name: string;
  phone: string;
  tags: string[];
}

export const SubscribersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreParam } = useParams<{ storeId?: string }>();
  const { storeId, storeName, stores } = useStore();
  const selectStoreById = useStoreContextStore((state) => state.selectStoreById);
  const selectStoreBySlug = useStoreContextStore((state) => state.selectStoreBySlug);

  const routeStore = useMemo(() => {
    if (!routeStoreParam) return null;
    return stores.find((store) => store.id === routeStoreParam || store.slug === routeStoreParam) || null;
  }, [routeStoreParam, stores]);

  const effectiveStoreId = routeStore?.id || storeId || null;
  const effectiveStoreLabel = routeStore?.name || storeName || 'Loja selecionada';
  const effectiveStoreRouteKey = routeStoreParam || routeStore?.slug || effectiveStoreId || null;

  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState<NewSubscriber>({
    email: '',
    name: '',
    phone: '',
    tags: [],
  });
  const [importText, setImportText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!routeStoreParam || stores.length === 0) {
      return;
    }

    const matchedStore = stores.find(
      (store) => store.id === routeStoreParam || store.slug === routeStoreParam,
    );

    if (!matchedStore) {
      return;
    }

    if (matchedStore.id === routeStoreParam) {
      selectStoreById(matchedStore.id);
      return;
    }

    selectStoreBySlug(matchedStore.slug);
  }, [routeStoreParam, selectStoreById, selectStoreBySlug, stores]);

  useEffect(() => {
    const loadCustomers = async () => {
      if (!effectiveStoreId) {
        setLoading(false);
        setSubscribers([]);
        return;
      }

      try {
        setLoading(true);
        const data = await marketingService.subscribers.list(effectiveStoreId);
        setSubscribers(data);
        logger.info('Loaded customer base', { count: data.length, storeId: effectiveStoreId });
      } catch (error) {
        logger.error('Failed to load customer base', error);
        toast.error('Erro ao carregar a base de clientes');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [effectiveStoreId]);

  const filteredSubscribers = useMemo(() => {
    let result = subscribers;

    if (statusFilter !== 'all') {
      result = result.filter((subscriber) => subscriber.status === statusFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((subscriber) =>
        subscriber.email.toLowerCase().includes(searchLower)
        || subscriber.name.toLowerCase().includes(searchLower)
        || subscriber.phone?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [search, statusFilter, subscribers]);

  const stats = useMemo(() => ({
    total: subscribers.length,
    active: subscribers.filter((subscriber) => subscriber.status === 'active').length,
    withOrders: subscribers.filter((subscriber) => (subscriber.total_orders || 0) > 0).length,
    unsubscribed: subscribers.filter((subscriber) => subscriber.status === 'unsubscribed').length,
  }), [subscribers]);

  const revenueFromBase = useMemo(
    () => subscribers.reduce((sum, subscriber) => sum + Number(subscriber.total_spent || 0), 0),
    [subscribers],
  );

  const handleAddSubscriber = async () => {
    if (!effectiveStoreId) return;
    if (!newSubscriber.email.trim()) {
      toast.error('E-mail é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const created = await marketingService.subscribers.create({
        store: effectiveStoreId,
        email: newSubscriber.email,
        name: newSubscriber.name,
        phone: newSubscriber.phone,
        tags: newSubscriber.tags,
        status: 'active',
        accepts_marketing: true,
      });

      setSubscribers((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewSubscriber({ email: '', name: '', phone: '', tags: [] });
      toast.success('Cliente adicionado à base');
    } catch (error) {
      logger.error('Failed to add customer', error);
      toast.error('Erro ao adicionar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!effectiveStoreId) return;
    if (!importText.trim()) {
      toast.error('Cole os contatos para importar');
      return;
    }

    setSaving(true);
    try {
      const contacts = importText
        .trim()
        .split('\n')
        .map((line) => {
          const parts = line.split(',').map((part) => part.trim());
          return {
            email: parts[0],
            name: parts[1] || '',
            phone: parts[2] || '',
          };
        })
        .filter((contact) => contact.email && contact.email.includes('@'));

      if (contacts.length === 0) {
        toast.error('Nenhum e-mail válido encontrado');
        return;
      }

      const result = await marketingService.subscribers.importCsv(effectiveStoreId, contacts);
      const data = await marketingService.subscribers.list(effectiveStoreId);
      setSubscribers(data);

      setShowImportModal(false);
      setImportText('');
      toast.success(`Importados: ${result.created} novos, ${result.updated} atualizados`);
    } catch (error) {
      logger.error('Failed to import customers', error);
      toast.error('Erro ao importar clientes');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const csv = filteredSubscribers
      .map((subscriber) => `${subscriber.email},${subscriber.name},${subscriber.phone || ''},${subscriber.status}`)
      .join('\n');

    const blob = new Blob([`email,name,phone,status\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `clientes-${effectiveStoreLabel || 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação iniciada');
  };

  const handleUnsubscribe = async (subscriber: Subscriber) => {
    try {
      await marketingService.subscribers.unsubscribe(subscriber.id);
      setSubscribers((prev) =>
        prev.map((item) => item.id === subscriber.id ? { ...item, status: 'unsubscribed' as const } : item),
      );
      toast.success('Cliente marcado como descadastrado');
    } catch (error) {
      logger.error('Failed to unsubscribe customer', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const openOrders = () => {
    if (!effectiveStoreRouteKey) {
      navigate('/stores');
      return;
    }

    navigate(`/stores/${effectiveStoreRouteKey}/orders`);
  };

  if (!effectiveStoreId) {
    return (
      <div className="p-6 text-center">
        <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhuma loja selecionada</h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-4">Selecione uma loja para visualizar a base de clientes.</p>
        <Button onClick={() => navigate('/stores')}>Ver lojas</Button>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Base de clientes</h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Clientes e contatos agregados da loja <strong>{effectiveStoreLabel}</strong>, prontos para operação e campanhas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Pedidos + contatos centralizados
            </span>
            <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
              Operação por loja
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={openOrders}>
            <ShoppingBagIcon className="mr-2 h-5 w-5" />
            Ver pedidos
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <ArrowUpTrayIcon className="mr-2 h-5 w-5" />
            Importar
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
            Exportar
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="mr-2 h-5 w-5" />
            Novo cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
              <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total na base</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/40">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Ativos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/40">
              <ShoppingBagIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withOrders}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Já compraram</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/40">
              <XCircleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.unsubscribed}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Descadastrados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <EnvelopeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {revenueFromBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Receita identificada</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
              placeholder="Buscar por e-mail, nome ou telefone..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="unsubscribed">Descadastrados</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </Card>

      <Card>
        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {subscribers.length === 0 ? 'Nenhum cliente na base ainda' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="mb-4 text-gray-500 dark:text-zinc-400">
              {subscribers.length === 0
                ? 'Assim que os pedidos entrarem ou contatos forem importados, eles aparecerão aqui.'
                : 'Ajuste os filtros ou refine a busca para encontrar o cliente.'}
            </p>
            {subscribers.length === 0 && (
              <Button onClick={() => setShowAddModal(true)}>
                <PlusIcon className="mr-2 h-5 w-5" />
                Adicionar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50 dark:bg-black">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">Tags</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">Compras</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-gray-50 dark:bg-black dark:hover:bg-zinc-700/60">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{subscriber.name || subscriber.email}</p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">{subscriber.email}</p>
                        {subscriber.phone && (
                          <p className="text-sm text-gray-400">{subscriber.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        subscriber.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : subscriber.status === 'unsubscribed'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {subscriber.status === 'active' ? 'Ativo' : subscriber.status === 'unsubscribed' ? 'Descadastrado' : 'Bounced'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {subscriber.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-zinc-300">
                            {tag}
                          </span>
                        ))}
                        {subscriber.tags && subscriber.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{subscriber.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="block text-gray-900 dark:text-white">{subscriber.total_orders || 0} pedidos</span>
                        {subscriber.total_spent > 0 && (
                          <span className="text-sm text-gray-500 dark:text-zinc-400">
                            R$ {Number(subscriber.total_spent).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate('/marketing/email/new')}
                          className="rounded p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                          title="Iniciar campanha de e-mail"
                        >
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                        {subscriber.status === 'active' && (
                          <button
                            onClick={() => handleUnsubscribe(subscriber)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Marcar como descadastrado"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Novo cliente">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">E-mail *</label>
            <input
              type="email"
              value={newSubscriber.email}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
              placeholder="cliente@exemplo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Nome</label>
            <input
              type="text"
              value={newSubscriber.name}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Telefone</label>
            <input
              type="tel"
              value={newSubscriber.phone}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSubscriber} disabled={saving}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Importar clientes">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Cole os contatos no formato <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">email,nome,telefone</code>, um por linha.
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="h-48 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-primary-500 dark:border-zinc-700"
            placeholder={`joao@email.com,João Silva,11999999999\nmaria@email.com,Maria Santos\npedro@email.com`}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={saving}>
              {saving ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubscribersPage;
