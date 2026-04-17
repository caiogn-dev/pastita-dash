import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/common';
import { getErrorMessage } from '../../services';
import storesApi, { StoreCustomer } from '../../services/storesApi';
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string | number; dot: string }> = ({ label, value, dot }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
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
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
      <span className="text-xs text-zinc-500">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="px-2 text-zinc-600 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === Math.ceil(total / pageSize)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
        const res = await storesApi.getCustomers({ store: storeQuery });
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

  if (loading) return <PageLoading />;

  return (
    <div className="p-6 space-y-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total" value={kpis.total} dot="bg-blue-400" />
        <KpiCard label="Ativos" value={kpis.active} dot="bg-green-400" />
        <KpiCard label="Com pedidos" value={kpis.withOrders} dot="bg-orange-400" />
        <KpiCard label="Receita total" value={`R$ ${formatMoney(kpis.totalRevenue)}`} dot="bg-indigo-400" />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-white">Clientes</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <button
            onClick={() => loadCustomers(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Contato</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Gasto total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Último pedido</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {paginated.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-zinc-300">
                            {(customer.user_name || customer.user_email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{customer.user_name || '—'}</p>
                          <p className="text-xs text-zinc-500">{customer.user_email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {(customer.phone || customer.whatsapp) && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <PhoneIcon className="h-3 w-3 shrink-0" />
                            {customer.whatsapp || customer.phone}
                          </div>
                        )}
                        {customer.user_email && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <EnvelopeIcon className="h-3 w-3 shrink-0" />
                            {customer.user_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                        <ShoppingBagIcon className="h-3 w-3" />
                        {customer.total_orders ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="font-semibold text-white">
                        R$ {formatMoney(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-zinc-500">{formatDate(customer.last_order_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                          <CheckBadgeIcon className="h-3 w-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium">
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
  );
};

export default CustomersPage;
