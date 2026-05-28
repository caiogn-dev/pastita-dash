/**
 * CustomerPanel — Painel lateral de CRM exibido ao lado do chat.
 *
 * Mostra dados do UnifiedUser (nome, telefone, total gasto, pedidos),
 * endereços salvos, pedido ativo e ações rápidas.
 *
 * TODO backend (Fase 3): Os endpoints CRM ainda estão sendo implementados.
 * Quando o backend não estiver pronto, o painel exibe um estado de erro silencioso.
 */
import React, { useEffect, useState } from 'react';
import {
  XMarkIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
  HomeIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { crmApi } from '../../services/crmApi';
import type { CustomerProfile, CustomerSearchResult } from '../../types/crm';

// ── Props ──────────────────────────────────────────────────────────────────────

interface CustomerPanelProps {
  storeSlug: string;
  /** UnifiedUser ID — typically from the conversation's unified_user field */
  unifiedUserId: string | null;
  onNewOrder: (customer: CustomerSearchResult) => void;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:          { label: 'Recebido',       cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  processing:       { label: 'Processando',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  confirmed:        { label: 'Confirmado',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  preparing:        { label: 'Preparando',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  ready:            { label: 'Pronto',         cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  out_for_delivery: { label: 'Em entrega',     cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  delivered:        { label: 'Entregue',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled:        { label: 'Cancelado',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  awaiting_payment: { label: 'Ag. pagamento',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

function getStatusBadge(status: string) {
  return ORDER_STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
}

function AddressIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();
  if (lower.includes('trabalho') || lower.includes('work')) {
    return <BriefcaseIcon className="h-3.5 w-3.5" />;
  }
  return <HomeIcon className="h-3.5 w-3.5" />;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse bg-gray-200 dark:bg-zinc-700 ${className ?? ''}`}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const CustomerPanel: React.FC<CustomerPanelProps> = ({
  storeSlug,
  unifiedUserId,
  onNewOrder,
  onClose,
}) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unifiedUserId || !storeSlug) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    crmApi
      .getCustomerProfile(storeSlug, unifiedUserId)
      .then(({ data }) => setProfile(data))
      .catch(() => {
        setError(
          'Perfil CRM indisponível (backend em implementação — Fase 3)'
        );
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [storeSlug, unifiedUserId]);

  const activeOrderStatus = profile?.active_order
    ? getStatusBadge(profile.active_order.status)
    : null;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          Cliente CRM
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* No conversation selected */}
        {!unifiedUserId && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
            <span className="text-3xl">👤</span>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Selecione uma conversa para ver o perfil do cliente.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {unifiedUserId && loading && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center gap-2 pt-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        )}

        {/* Error state */}
        {unifiedUserId && !loading && error && (
          <div className="p-4">
            <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">{error}</p>
            </div>
          </div>
        )}

        {/* Profile loaded */}
        {!loading && profile && (
          <div className="p-4 space-y-4">
            {/* Header: avatar + info */}
            <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-base"
                style={{ backgroundColor: '#6366f1' }}
              >
                {profile.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {profile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {profile.phone_number}
              </p>
              {profile.total_orders > 0 && (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    {fmt(profile.total_spent)} gastos
                  </span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    · {profile.total_orders} pedido(s)
                  </span>
                </div>
              )}
              {profile.last_order_at && (
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                  Último pedido:{' '}
                  {new Date(profile.last_order_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Addresses */}
            {profile.addresses.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">
                  Endereços salvos
                </p>
                <div className="space-y-1.5">
                  {profile.addresses.slice(0, 3).map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800"
                    >
                      <span className="mt-0.5 text-gray-400 dark:text-zinc-500 flex-shrink-0">
                        <AddressIcon label={addr.label} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                          {addr.label}
                          {addr.is_default && (
                            <span className="ml-1 text-primary-600 dark:text-primary-400">
                              (padrão)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-zinc-300 truncate">
                          {addr.street}, {addr.number}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                          {addr.neighborhood}, {addr.city}-{addr.state}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active order */}
            {profile.active_order && activeOrderStatus && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">
                  Pedido ativo
                </p>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${activeOrderStatus.cls}`}
                  >
                    {activeOrderStatus.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {fmt(profile.active_order.total)}
                  </span>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">
                Ações rápidas
              </p>
              <div className="space-y-1.5">
                {/* Novo Pedido */}
                <button
                  type="button"
                  onClick={() => onNewOrder(profile)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-100 dark:border-primary-800 transition-colors"
                >
                  <ShoppingBagIcon className="h-4 w-4 flex-shrink-0" />
                  Novo Pedido
                </button>

                {/* Enviar localização — TODO quando endpoint existir */}
                <button
                  type="button"
                  disabled
                  title="Disponível quando o backend implementar o endpoint"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 dark:text-zinc-500 border border-gray-100 dark:border-zinc-800 cursor-not-allowed opacity-50"
                >
                  <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                  Enviar localização
                  <span className="ml-auto text-[9px]">TODO</span>
                </button>

                {/* Confirmar pedido ativo */}
                {profile.active_order && (
                  <button
                    type="button"
                    disabled
                    title="Confirmar pedido — TODO PATCH endpoint"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 cursor-not-allowed opacity-50"
                  >
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                    Confirmar pedido
                    <span className="ml-auto text-[9px]">TODO</span>
                  </button>
                )}

                {/* Cancelar pedido ativo */}
                {profile.active_order && (
                  <button
                    type="button"
                    disabled
                    title="Cancelar pedido — TODO PATCH endpoint"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/30 cursor-not-allowed opacity-50"
                  >
                    <XCircleIcon className="h-4 w-4 flex-shrink-0" />
                    Cancelar pedido
                    <span className="ml-auto text-[9px]">TODO</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPanel;
