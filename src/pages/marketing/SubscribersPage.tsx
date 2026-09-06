import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  PlusIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Card, Modal, Loading } from '../../components/common';
import { PageShell, Tabela, RowActions, Badge, SearchInput, KpiGrid, Select } from '../../components/ui';
import { useStore } from '../../hooks';
import { marketingService, Subscriber } from '../../services/marketingService';
import { useRootStore } from '../../stores/rootStore';
import logger from '../../services/logger';
import { formatCurrency } from '../../utils/formatters';

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
  const { setSelectedStore } = useRootStore();

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

    if (matchedStore) {
      setSelectedStore(matchedStore.id);
    }
  }, [routeStoreParam, stores, setSelectedStore]);

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
        <h2 className="text-xl font-semibold text-fg-token mb-2">Nenhuma loja selecionada</h2>
        <p className="text-fg-muted-token mb-4">Selecione uma loja para visualizar a base de clientes.</p>
        <Button onClick={() => navigate('/stores')}>Ver lojas</Button>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'Base de clientes' }]}
      titulo="Base de clientes"
      acoes={
        <>
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
        </>
      }
    >

      <KpiGrid
        itens={[
          {
            label: 'Total na base',
            value: stats.total,
            definicao: 'Todo mundo com contato salvo, tenha comprado ou não.',
            icone: <UserGroupIcon />,
          },
          {
            label: 'Ativos',
            value: stats.active,
            definicao: 'Aceitam receber mensagem. São estes que entram numa campanha.',
            tone: 'success',
            icone: <CheckCircleIcon />,
          },
          {
            label: 'Já compraram',
            value: stats.withOrders,
            definicao: 'Têm pelo menos um pedido pago. A lista mais barata que existe.',
            icone: <ShoppingBagIcon />,
          },
          {
            label: 'Descadastrados',
            value: stats.unsubscribed,
            definicao: 'Pediram para não receber. Ficam de fora de toda campanha.',
            tone: 'warning',
            icone: <XCircleIcon />,
          },
          {
            label: 'Receita identificada',
            value: formatCurrency(revenueFromBase),
            definicao: 'Soma dos pedidos pagos de quem está nesta base.',
            tone: 'brand',
            icone: <EnvelopeIcon />,
          },
        ]}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchInput
              aria-label="Buscar cliente"
              placeholder="Buscar por e-mail, nome ou telefone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            rotuloOculto="Filtrar por status"
            valor={statusFilter}
            onMudar={setStatusFilter}
            opcoes={[
              { valor: 'all', rotulo: 'Todos os status' },
              { valor: 'active', rotulo: 'Ativos' },
              { valor: 'unsubscribed', rotulo: 'Descadastrados' },
              // "Bounced" é jargão de e-mail; o dono não sabe o que é.
              { valor: 'bounced', rotulo: 'E-mail inválido' },
            ]}
          />
        </div>
      </Card>

      <Card>
        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-fg-token">
              {subscribers.length === 0 ? 'Nenhum cliente na base ainda' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="mb-4 text-fg-muted-token">
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
          <Tabela<(typeof filteredSubscribers)[number]>
            itens={filteredSubscribers}
            chave={(s) => String(s.id)}
            rotuloDaLinha={(s) => `Cliente ${s.name || s.email}`}
            colunas={[
              {
                chave: 'cliente',
                cabecalho: 'Cliente',
                render: (s) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg-token">{s.name || s.email}</p>
                    <p className="truncate text-sm text-fg-muted-token">{s.email}</p>
                    {s.phone && <p className="text-sm text-fg-muted-token">{s.phone}</p>}
                  </div>
                ),
              },
              {
                chave: 'status',
                cabecalho: 'Status',
                render: (s) => (
                  <Badge
                    tone={
                      s.status === 'active'
                        ? 'success'
                        : s.status === 'unsubscribed'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {s.status === 'active'
                      ? 'Ativo'
                      : s.status === 'unsubscribed'
                        ? 'Descadastrado'
                        : 'E-mail inválido'}
                  </Badge>
                ),
              },
              {
                chave: 'tags',
                cabecalho: 'Tags',
                classe: 'max-lg:hidden',
                render: (s) => (
                  <div className="flex flex-wrap gap-1">
                    {s.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-surface-2 px-2 py-0.5 text-xs text-fg-muted-token"
                      >
                        {tag}
                      </span>
                    ))}
                    {s.tags && s.tags.length > 3 && (
                      <span className="text-xs text-fg-muted-token">+{s.tags.length - 3}</span>
                    )}
                  </div>
                ),
              },
              {
                chave: 'compras',
                cabecalho: 'Compras',
                render: (s) => (
                  <div>
                    <span className="block text-fg-token">{s.total_orders || 0} pedidos</span>
                    {s.total_spent > 0 && (
                      <span className="text-sm text-fg-muted-token">
                        R$ {Number(s.total_spent).toFixed(2)}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                chave: 'acoes',
                cabecalho: 'Ações',
                alinhamento: 'direita',
                render: (s) => (
                  // Eram um envelope e uma lixeira nus, e a lixeira NÃO apaga
                  // o cliente: marca como descadastrado. Ícone de lixo para
                  // uma ação que não é exclusão é a pior das adivinhações.
                  <RowActions
                    rotulo={`Ações de ${s.name || s.email}`}
                    acoes={[
                      {
                        rotulo: 'Criar campanha de e-mail',
                        icone: <EnvelopeIcon className="h-4 w-4" />,
                        onClick: () => navigate('/marketing/email/new'),
                      },
                      ...(s.status === 'active'
                        ? [{
                            rotulo: 'Marcar como descadastrado',
                            destrutiva: true,
                            onClick: () => handleUnsubscribe(s),
                          }]
                        : []),
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Novo cliente">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]">E-mail *</label>
            <input
              type="email"
              value={newSubscriber.email}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-border-token px-3 py-2 focus:ring-2 focus:ring-brand dark:border-[var(--dark-border,#2a2a2a)]"
              placeholder="cliente@exemplo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]">Nome</label>
            <input
              type="text"
              value={newSubscriber.name}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-border-token px-3 py-2 focus:ring-2 focus:ring-brand dark:border-[var(--dark-border,#2a2a2a)]"
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]">Telefone</label>
            <input
              type="tel"
              value={newSubscriber.phone}
              onChange={(event) => setNewSubscriber((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-border-token px-3 py-2 focus:ring-2 focus:ring-brand dark:border-[var(--dark-border,#2a2a2a)]"
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
          <p className="text-sm text-fg-muted-token">
            Cole os contatos no formato <code className="rounded bg-surface-2 px-1 dark:bg-[var(--dark-bg-hover,#161616)]">email,nome,telefone</code>, um por linha.
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="h-48 w-full rounded-lg border border-border-token px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-brand dark:border-[var(--dark-border,#2a2a2a)]"
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
    </PageShell>
  );
};

export default SubscribersPage;
