import React, { useState, useEffect } from 'react';
import logger from '../../services/logger';
import {
  UserGroupIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  TruckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  customerSessionService,
  companyProfileService,
  sessionStatusLabels,
} from '../../services/automation';
import { CustomerSession, CompanyProfile, SessionStatus } from '../../types';
import { toast } from 'react-hot-toast';
import { PageShell, Tabela, RowActions } from '../../components/ui';

const statusColors: Record<SessionStatus, string> = {
  active: 'bg-blue-100 text-blue-800',
  cart_created: 'bg-yellow-100 text-yellow-800',
  cart_abandoned: 'bg-red-100 text-red-800',
  checkout: 'bg-purple-100 text-purple-800',
  payment_pending: 'bg-orange-100 text-orange-800',
  payment_confirmed: 'bg-green-100 text-green-800',
  order_placed: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-surface-2 text-fg-token',
  expired: 'bg-surface-2 text-fg-muted-token',
};

const POR_PAGINA = 20;

const CustomerSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    company_id: '',
    status: '',
    phone_number: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [page, filters]);

  const loadCompanies = async () => {
    try {
      const response = await companyProfileService.list({ page_size: 100 });
      setCompanies(response.results);
    } catch (error) {
      logger.error('Error loading companies:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, page_size: POR_PAGINA };
      if (filters.company_id) params.company_id = filters.company_id;
      if (filters.status) params.status = filters.status;
      if (filters.phone_number) params.phone_number = filters.phone_number;

      const response = await customerSessionService.list(params);
      setSessions(response.results);
      setTotalCount(response.count);
    } catch (error) {
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (sessionId: string, eventType: string) => {
    try {
      await customerSessionService.sendNotification(sessionId, { event_type: eventType as any });
      toast.success('Notificação enviada!');
      loadSessions();
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'cart_created':
      case 'cart_abandoned':
        return <ShoppingCartIcon className="h-5 w-5" />;
      case 'payment_pending':
      case 'payment_confirmed':
        return <CreditCardIcon className="h-5 w-5" />;
      case 'order_placed':
      case 'completed':
        return <TruckIcon className="h-5 w-5" />;
      default:
        return <UserGroupIcon className="h-5 w-5" />;
    }
  };

  return (
    <PageShell
      titulo="Sessões de clientes"
      acoes={
        <button
        onClick={() => setShowFilters(!showFilters)}
        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
        showFilters
        ? 'border-green-500 text-green-700 bg-green-50'
        : 'border-border-token text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] bg-surface hover:bg-surface-2 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
        }`}
        >
        <FunnelIcon className="h-5 w-5 mr-2" />
        Filtros
        </button>
      }
    >

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface shadow rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]">Empresa</label>
              <select
                value={filters.company_id}
                onChange={(e) => {
                  setFilters({ ...filters, company_id: e.target.value });
                  setPage(1);
                }}
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]">Status</label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPage(1);
                }}
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Todos</option>
                {Object.entries(sessionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">Telefone</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-fg-muted-token" />
                </div>
                <input
                  type="text"
                  value={filters.phone_number}
                  onChange={(e) => {
                    setFilters({ ...filters, phone_number: e.target.value });
                    setPage(1);
                  }}
                  placeholder="Buscar por telefone"
                  className="block w-full pl-10 rounded-md border-border-token dark:border-zinc-700 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ company_id: '', status: '', phone_number: '' });
                  setPage(1);
                }}
                className="px-4 py-2 text-sm text-fg-muted-token hover:text-fg-token"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabela<CustomerSession>
        itens={sessions}
        chave={(s) => s.id}
        rotuloDaLinha={(s) => `Ver ${s.customer_name || 'cliente'} ${s.phone_number}`}
        onAbrir={setSelectedSession}
        carregando={loading}
        vazio={{
          titulo: 'Ninguém no meio de um pedido agora',
          descricao: 'Assim que um cliente começar a montar o carrinho, ele aparece aqui.',
          icone: <UserGroupIcon className="h-12 w-12" />,
        }}
        paginacao={{
          pagina: page,
          porPagina: POR_PAGINA,
          total: totalCount,
          onPagina: setPage,
          rotulo: 'sessões',
        }}
        colunas={[
          {
            chave: 'cliente',
            cabecalho: 'Cliente',
            render: (s) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
                  {getStatusIcon(s.status)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-fg-token">
                    {s.customer_name || 'Cliente'}
                  </div>
                  <div className="text-sm text-fg-muted-token">{s.phone_number}</div>
                </div>
              </div>
            ),
          },
          { chave: 'empresa', cabecalho: 'Empresa', soNoDesktop: true, render: (s) => s.company_name },
          {
            chave: 'status',
            cabecalho: 'Status',
            render: (s) => (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[s.status]}`}
              >
                {sessionStatusLabels[s.status] || s.status}
              </span>
            ),
          },
          {
            chave: 'carrinho',
            cabecalho: 'Carrinho',
            render: (s) =>
              (s.cart_items_count || 0) > 0 ? (
                <div>
                  <div className="text-sm font-medium text-fg-token">
                    {formatCurrency(s.cart_total || 0)}
                  </div>
                  <div className="text-sm text-fg-muted-token">
                    {s.cart_items_count} {(s.cart_items_count || 0) === 1 ? 'item' : 'itens'}
                  </div>
                </div>
              ) : (
                <span className="text-sm text-fg-muted-token">—</span>
              ),
          },
          {
            chave: 'atividade',
            cabecalho: 'Última atividade',
            render: (s) => (s.last_activity_at ? formatDate(s.last_activity_at) : '—'),
          },
          {
            chave: 'acoes',
            cabecalho: 'Ações',
            alinhamento: 'direita',
            render: (s) => (
              // Eram dois sinos de cores diferentes — amarelo para carrinho,
              // laranja para PIX — e um olho. Três pictogramas sem rótulo,
              // sendo que só um deles aparece de cada vez.
              <RowActions
                rotulo={`Ações de ${s.customer_name || s.phone_number}`}
                acoes={[
                  { rotulo: 'Ver detalhes', onClick: () => setSelectedSession(s) },
                  ...(s.status === 'cart_abandoned'
                    ? [{
                        rotulo: 'Lembrar do carrinho',
                        onClick: () => handleSendNotification(s.id, 'cart_abandoned'),
                      }]
                    : []),
                  ...(s.status === 'payment_pending'
                    ? [{
                        rotulo: 'Lembrar do PIX',
                        onClick: () => handleSendNotification(s.id, 'pix_reminder'),
                      }]
                    : []),
                ]}
              />
            ),
          },
        ]}
      />

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-black/75" onClick={() => setSelectedSession(null)} />
            <div className="relative bg-surface dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-border-token dark:border-zinc-800">
                <h3 className="text-lg font-medium text-fg-token">
                  Detalhes da Sessão
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Cliente</label>
                    <p className="mt-1 text-sm text-fg-token">
                      {selectedSession.customer_name || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Telefone</label>
                    <p className="mt-1 text-sm text-fg-token">{selectedSession.phone_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Email</label>
                    <p className="mt-1 text-sm text-fg-token">
                      {selectedSession.customer_email || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Status</label>
                    <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedSession.status]
                    }`}>
                      {sessionStatusLabels[selectedSession.status]}
                    </span>
                  </div>
                </div>

                {/* Cart Info */}
                {(selectedSession.cart_items_count || 0) > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-fg-token mb-2">Carrinho</h4>
                    <div className="bg-surface-2 dark:bg-black rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-fg-muted-token">
                          {selectedSession.cart_items_count} {(selectedSession.cart_items_count || 0) === 1 ? 'item' : 'itens'}
                        </span>
                        <span className="text-lg font-medium text-fg-token">
                          {formatCurrency(selectedSession.cart_total || 0)}
                        </span>
                      </div>
                      {selectedSession.cart_created_at && (
                        <p className="mt-2 text-xs text-fg-muted-token">
                          Criado em: {formatDate(selectedSession.cart_created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                {selectedSession.pix_code && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-fg-token mb-2">Pagamento PIX</h4>
                    <div className="bg-surface-2 dark:bg-black rounded-lg p-4">
                      <p className="text-xs text-fg-muted-token mb-2">Código PIX:</p>
                      <code className="block text-xs bg-surface dark:bg-zinc-900 p-2 rounded border overflow-x-auto">
                        {selectedSession.pix_code}
                      </code>
                      {selectedSession.pix_expires_at && (
                        <p className="mt-2 text-xs text-fg-muted-token">
                          Expira em: {formatDate(selectedSession.pix_expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {(selectedSession.notifications_sent || []).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-fg-token mb-2">Notificações Enviadas</h4>
                    <ul className="space-y-2">
                      {(selectedSession.notifications_sent || []).map((notification, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <span className="text-fg-muted-token">{notification.type}</span>
                          <span className="text-fg-muted-token">{formatDate(notification.sent_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Session IDs */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-fg-token mb-2">Identificadores</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-fg-muted-token">Session ID</label>
                      <p className="font-mono text-fg-token">{selectedSession.session_id}</p>
                    </div>
                    {selectedSession.external_customer_id && (
                      <div>
                        <label className="text-fg-muted-token">Customer ID Externo</label>
                        <p className="font-mono text-fg-token">{selectedSession.external_customer_id}</p>
                      </div>
                    )}
                    {selectedSession.external_order_id && (
                      <div>
                        <label className="text-fg-muted-token">Order ID Externo</label>
                        <p className="font-mono text-fg-token">{selectedSession.external_order_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-token dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 border border-border-token dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface dark:bg-zinc-900 hover:bg-surface-2 dark:hover:bg-zinc-700 dark:bg-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default CustomerSessionsPage;
