import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShoppingBagIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  UserGroupIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/common';
import { getErrorMessage } from '../../services';
import storesApi, { StoreCustomer, StoreOrder } from '../../services/storesApi';
import { useStore } from '../../hooks';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatMoney = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  out_for_delivery: 'Em entrega', delivered: 'Entregue', cancelled: 'Cancelado',
  ready: 'Pronto', completed: 'Concluído', failed: 'Falhou',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ─── Customer Drawer ──────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customer: StoreCustomer | null;
  onClose: () => void;
}

const CustomerDrawer: React.FC<CustomerDrawerProps> = ({ customer, onClose }) => {
  const { storeId, storeSlug } = useStore();
  const storeQuery = storeSlug || storeId;
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!customer || !storeQuery) return;
    setOrders([]);
    setLoadingOrders(true);
    // getCustomerOrders endpoint is unreliable — fetch all store orders and filter by customer.user
    storesApi.getOrders({ store: storeQuery, page_size: 200 })
      .then(res => {
        const all = res.results || [];
        setOrders(all.filter(o => o.customer === customer.user));
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [customer?.id, storeQuery]);

  const avgTicket = useMemo(() => {
    if (!customer || !customer.total_orders) return 0;
    return Number(customer.total_spent) / customer.total_orders;
  }, [customer]);

  const whatsappNumber = customer?.whatsapp || customer?.phone || '';
  const cleanPhone = whatsappNumber.replace(/\D/g, '');

  if (!customer) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-[9999] w-full max-w-lg bg-white dark:bg-zinc-950 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-zinc-800 border-2 border-primary-100 dark:border-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {(customer.user_name || customer.user_email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white leading-tight">{customer.user_name || '—'}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                Cliente desde {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800 border-b border-gray-100 dark:border-zinc-800">
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Gasto total</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              R$ {formatMoney(customer.total_spent)}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Pedidos</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{customer.total_orders ?? 0}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Ticket médio</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">R$ {formatMoney(avgTicket)}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Contato</p>
            <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800 overflow-hidden">
              {(customer.whatsapp || customer.phone) && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <PhoneIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-zinc-300">{customer.whatsapp || customer.phone}</span>
                </div>
              )}
              {customer.user_email && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-zinc-300">{customer.user_email}</span>
                </div>
              )}
              {customer.last_order_at && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    Último pedido {formatDistanceToNow(new Date(customer.last_order_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              )}
              {customer.tags?.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <TagIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order history */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              Histórico de pedidos
            </p>
            {loadingOrders ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700">
                <ShoppingBagIcon className="h-7 w-7 mx-auto mb-2 text-gray-300 dark:text-zinc-600" />
                <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-zinc-900/40 border-b border-gray-100 dark:border-zinc-800">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedido</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Data</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/60">
                    {orders.slice(0, 15).map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          #{order.order_number}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-zinc-500 hidden sm:table-cell">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900 dark:text-white">
                          R$ {formatMoney(order.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Observações</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 leading-relaxed">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {cleanPhone && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              onClick={() => {
                onClose();
                navigate(`/whatsapp/inbox?search=${encodeURIComponent(cleanPhone)}`);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Abrir conversa no WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string | number; dot: string }> = ({ label, value, dot }) => (
  <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-2.5">
      <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
      <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
  </div>
);

const Pagination: React.FC<{
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}> = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-zinc-800">
      <span className="text-xs text-gray-500 dark:text-zinc-500">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="px-2 text-gray-400 dark:text-zinc-600 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? 'bg-primary-600 text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === Math.ceil(total / pageSize)}
          className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CustomersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId, storeSlug } = useStore();

  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Math.max(1, pageParam);

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p)); else next.delete('page');
      return next;
    });
  };

  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const storeQuery = storeSlug || storeId;

  const loadCustomers = useCallback(
    async (background = false) => {
      if (!storeQuery) { setLoading(false); return; }
      background ? setRefreshing(true) : setLoading(true);
      try {
        const res = await storesApi.getCustomers({ store: storeQuery, page_size: 500 });
        setCustomers(res.results || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storeQuery]
  );

  useEffect(() => { loadCustomers(false); }, [loadCustomers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      c.user_name?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.whatsapp?.includes(q)
    );
  }, [customers, search]);

  const kpis = useMemo(() => ({
    total: customers.length,
    active: customers.filter((c) => c.is_active).length,
    withOrders: customers.filter((c) => (c.total_orders ?? 0) > 0).length,
    totalRevenue: customers.reduce((s, c) => s + Number(c.total_spent ?? 0), 0),
  }), [customers]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null);

  if (loading) return <PageLoading />;

  return (
    <>
    <div className="p-6 space-y-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 max-xl:grid-cols-2 gap-4">
        <KpiCard label="Total" value={kpis.total} dot="bg-blue-400" />
        <KpiCard label="Ativos" value={kpis.active} dot="bg-green-400" />
        <KpiCard label="Com pedidos" value={kpis.withOrders} dot="bg-orange-400" />
        <KpiCard label="Receita total" value={`R$ ${formatMoney(kpis.totalRevenue)}`} dot="bg-indigo-400" />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Clientes</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:focus:border-primary-500 transition-colors"
            />
          </div>
          <button
            onClick={() => loadCustomers(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UserGroupIcon className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
            <p className="text-gray-400 dark:text-zinc-500 text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden md:table-cell">Contato</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Gasto total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden xl:table-cell">Último pedido</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/60">
                {paginated.map((customer) => (
                  <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-50 dark:bg-zinc-800 border border-primary-100 dark:border-zinc-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            {(customer.user_name || customer.user_email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{customer.user_name || '—'}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500">{customer.user_email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {(customer.phone || customer.whatsapp) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                            <PhoneIcon className="h-3 w-3 shrink-0" />
                            {customer.whatsapp || customer.phone}
                          </div>
                        )}
                        {customer.user_email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500">
                            <EnvelopeIcon className="h-3 w-3 shrink-0" />
                            {customer.user_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-300">
                        <ShoppingBagIcon className="h-3 w-3" />
                        {customer.total_orders ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="font-bold text-gray-900 dark:text-white">
                        R$ {formatMoney(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400 dark:text-zinc-500">{formatDate(customer.last_order_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          <CheckBadgeIcon className="h-3 w-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 text-xs font-medium">
                          <NoSymbolIcon className="h-3 w-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

    </div>

    <CustomerDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </>
  );
};

export default CustomersPage;
