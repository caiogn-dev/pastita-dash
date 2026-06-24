import React, { useEffect, useMemo, useState } from 'react';
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
  TagIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/common';
import { Card, Button, Badge, StatCard } from '../../components/ui';
import { getErrorMessage } from '../../services';
import { StoreCustomer, createCustomer, updateCustomer } from '../../services/storesApi';
import { useStore, useDebounce } from '../../hooks';
import { useCustomers } from '../../hooks/queries/useCustomers';
import { useCustomerStats } from '../../hooks/queries/useCustomerStats';
import { useCustomerOrders } from '../../hooks/queries/useCustomerOrders';
import { getAvatarColor, getInitials } from '../../utils/avatar';

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

// ─── Customer Form Drawer ─────────────────────────────────────────────────────

export interface CustomerFormDrawerProps {
  storeSlug?: string;
  customer?: StoreCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CustomerFormDrawer: React.FC<CustomerFormDrawerProps> = ({ storeSlug, customer, onClose, onSaved }) => {
  const [name, setName] = useState(customer?.user_name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(customer);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, { name, phone, whatsapp, notes });
      } else {
        await createCustomer(storeSlug, { name, phone, whatsapp, notes });
      }
      toast.success(isEdit ? 'Cliente atualizado' : 'Cliente criado');
      onSaved();
    } catch {
      toast.error('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token focus:outline-none focus:border-brand';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[9999] w-full max-w-md bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
          <p className="font-bold text-fg-token">{isEdit ? 'Editar cliente' : 'Novo cliente'}</p>
          <button onClick={onClose} className="p-2 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label htmlFor="cf-name" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Nome</label>
            <input id="cf-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cf-phone" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Telefone</label>
            <input id="cf-phone" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cf-wa" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">WhatsApp</label>
            <input id="cf-wa" className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cf-notes" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Notas</label>
            <textarea id="cf-notes" className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border-token flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-border-token text-sm font-semibold text-fg-token hover:bg-surface-2">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Customer Drawer ──────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customer: StoreCustomer | null;
  onClose: () => void;
  onEdit?: (customer: StoreCustomer) => void;
}

const CustomerDrawer: React.FC<CustomerDrawerProps> = ({ customer, onClose, onEdit }) => {
  const { storeId, storeSlug } = useStore();
  const storeQuery = storeSlug || storeId;
  const navigate = useNavigate();

  // Pedidos filtrados server-side por telefone (?customer=<phone>) — sem baixar 200.
  const customerPhone = customer?.phone || customer?.whatsapp || '';
  const ordersQuery = useCustomerOrders(storeQuery, customerPhone);
  const orders = ordersQuery.data?.results ?? [];
  const loadingOrders = ordersQuery.isLoading && ordersQuery.fetchStatus !== 'idle';

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
      <div className="fixed inset-y-0 right-0 z-[9999] w-full max-w-lg bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
          <div className="flex items-center gap-3">
            {(() => {
              const bg = getAvatarColor(customer.user_name || customer.user_email || '');
              const initials = getInitials(customer.user_name, customer.whatsapp || customer.phone);
              return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: bg }}>
                  {initials}
                </div>
              );
            })()}
            <div>
              <p className="font-bold text-fg-token leading-tight">{customer.user_name || '—'}</p>
              <p className="text-xs text-fg-muted-token">
                Cliente desde {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-border-token border-b border-border-token">
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-fg-muted-token uppercase tracking-widest mb-1">Gasto total</p>
            <p className="text-lg font-bold text-brand">
              R$ {formatMoney(customer.total_spent)}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-fg-muted-token uppercase tracking-widest mb-1">Pedidos</p>
            <p className="text-lg font-bold text-fg-token">{customer.total_orders ?? 0}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-fg-muted-token uppercase tracking-widest mb-1">Ticket médio</p>
            <p className="text-lg font-bold text-fg-token">R$ {formatMoney(avgTicket)}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Contato</p>
            <div className="rounded border border-border-token divide-y divide-border-token overflow-hidden">
              {(customer.whatsapp || customer.phone) && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <PhoneIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">{customer.whatsapp || customer.phone}</span>
                </div>
              )}
              {customer.user_email && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <EnvelopeIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">{customer.user_email}</span>
                </div>
              )}
              {customer.last_order_at && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDaysIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">
                    Último pedido {formatDistanceToNow(new Date(customer.last_order_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              )}
              {customer.tags?.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <TagIcon className="h-4 w-4 text-fg-muted-token shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map(tag => (
                      <Badge key={tag} tone="success">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order history */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">
              Histórico de pedidos
            </p>
            {!customerPhone ? (
              <div className="text-center py-8 rounded border border-dashed border-border-token">
                <PhoneIcon className="h-7 w-7 mx-auto mb-2 text-fg-muted-token" />
                <p className="text-sm text-fg-muted-token">Cliente sem telefone</p>
              </div>
            ) : loadingOrders ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 rounded border border-dashed border-border-token">
                <ShoppingBagIcon className="h-7 w-7 mx-auto mb-2 text-fg-muted-token" />
                <p className="text-sm text-fg-muted-token">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="rounded border border-border-token overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border-token">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-fg-muted-token uppercase tracking-widest">Pedido</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-fg-muted-token uppercase tracking-widest hidden sm:table-cell">Data</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-fg-muted-token uppercase tracking-widest">Status</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-fg-muted-token uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-token">
                    {orders.slice(0, 15).map(order => (
                      <tr key={order.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-fg-token">
                          #{order.order_number}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-fg-muted-token hidden sm:table-cell">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${STATUS_COLOR[order.status] ?? 'bg-surface-2 text-fg-muted-token'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-fg-token">
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
              <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Observações</p>
              <p className="text-sm text-fg-muted-token bg-surface-2 rounded p-4 leading-relaxed">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border-token flex gap-2">
          {onEdit && (
            <Button
              className="flex-1 justify-center"
              onClick={() => { onClose(); onEdit(customer); }}
            >
              Editar
            </Button>
          )}
          {cleanPhone && (
            <Button
              className="flex-1 justify-center"
              leftIcon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
              onClick={() => {
                onClose();
                navigate(`/whatsapp/chat?phone=${cleanPhone}`);
              }}
            >
              Iniciar conversa WhatsApp
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-between px-5 py-3 border-t border-border-token">
      <span className="text-xs text-fg-muted-token">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="px-2 text-fg-muted-token text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[2rem] h-8 rounded text-sm font-medium transition-colors ${
                p === page ? 'bg-brand text-white' : 'text-fg-muted-token hover:text-fg-token hover:bg-surface-2'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === Math.ceil(total / pageSize)}
          className="p-1.5 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 400);

  const storeQuery = storeSlug || storeId;

  // Lista paginada + busca server-side (count/results vêm do backend).
  const customersQuery = useCustomers(storeQuery, debouncedSearch, page, PAGE_SIZE);
  const customers = customersQuery.data?.results ?? [];
  const totalCount = customersQuery.data?.count ?? 0;

  // KPIs agregados pelo backend (sem reduce/filter sobre a página).
  const statsQuery = useCustomerStats(storeQuery);
  const kpis = {
    total: statsQuery.data?.total ?? 0,
    active: statsQuery.data?.active ?? 0,
    withOrders: statsQuery.data?.with_orders ?? 0,
    totalRevenue: Number(statsQuery.data?.total_revenue ?? 0),
  };

  useEffect(() => {
    if (customersQuery.error) toast.error(getErrorMessage(customersQuery.error));
  }, [customersQuery.error]);

  const refreshing = customersQuery.isFetching || statsQuery.isFetching;
  const refresh = () => {
    customersQuery.refetch();
    statsQuery.refetch();
  };

  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<StoreCustomer | null>(null);

  if (customersQuery.isLoading) return <PageLoading />;

  return (
    <>
    <div className="p-6 space-y-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 max-xl:grid-cols-2 gap-4">
        <StatCard label="Total" value={kpis.total} />
        <StatCard label="Ativos" value={kpis.active} tone="brand" />
        <StatCard label="Com pedidos" value={kpis.withOrders} />
        <StatCard label="Receita total" value={`R$ ${formatMoney(kpis.totalRevenue)}`} tone="brand" />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-fg-token">Clientes</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted-token" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (page !== 1) setPage(1); }}
              className="w-64 bg-surface border border-border-token text-fg-token placeholder-fg-muted-token rounded pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand transition-colors"
            />
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-1.5 rounded bg-surface border border-border-token text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingCustomer(null); setFormOpen(true); }}
            className="px-3 py-1.5 rounded bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-16 text-center">
            <UserGroupIcon className="h-8 w-8 mx-auto mb-3 text-fg-muted-token" />
            <p className="text-fg-muted-token text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-token bg-surface-2">
                  <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden md:table-cell">Contato</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden lg:table-cell">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden lg:table-cell">Gasto total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden xl:table-cell">Último pedido</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-fg-muted-token uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-token">
                {customers.map((customer) => {
                  const avatarBg = getAvatarColor(customer.user_name || customer.user_email || '');
                  const avatarInitials = getInitials(customer.user_name, customer.whatsapp || customer.phone);
                  const ltv = Number(customer.total_spent ?? 0);
                  return (
                  <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="cursor-pointer hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarBg }}>
                          {avatarInitials}
                        </div>
                        <div>
                          <p className="font-semibold text-fg-token">{customer.user_name || '—'}</p>
                          <p className="text-xs text-fg-muted-token">{customer.user_email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {(customer.phone || customer.whatsapp) && (
                          <div className="flex items-center gap-1.5 text-xs text-fg-muted-token">
                            <PhoneIcon className="h-3 w-3 shrink-0" />
                            {customer.whatsapp || customer.phone}
                          </div>
                        )}
                        {customer.user_email && (
                          <div className="flex items-center gap-1.5 text-xs text-fg-muted-token">
                            <EnvelopeIcon className="h-3 w-3 shrink-0" />
                            {customer.user_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <Badge tone="neutral" className="gap-1.5">
                        <ShoppingBagIcon className="h-3 w-3" />
                        {customer.total_orders ?? 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {ltv > 500 ? (
                        <Badge tone="success">R$ {ltv.toFixed(2)}</Badge>
                      ) : (
                        <span className="font-bold text-fg-token">
                          R$ {formatMoney(customer.total_spent)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-fg-muted-token">{formatDate(customer.last_order_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.is_active ? (
                        <Badge tone="success" className="gap-1">
                          <CheckBadgeIcon className="h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="gap-1">
                          <NoSymbolIcon className="h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} total={totalCount} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

    </div>

    <CustomerDrawer
      customer={selectedCustomer}
      onClose={() => setSelectedCustomer(null)}
      onEdit={(c) => { setEditingCustomer(c); setFormOpen(true); }}
    />
    {formOpen && (
      <CustomerFormDrawer
        storeSlug={storeSlug ?? storeId ?? undefined}
        customer={editingCustomer}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          customersQuery.refetch();
          statsQuery.refetch();
        }}
      />
    )}
    </>
  );
};

export default CustomersPage;
