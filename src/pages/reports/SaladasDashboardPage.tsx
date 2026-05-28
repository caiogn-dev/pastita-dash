import React, { useState, useEffect, useCallback } from 'react';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card } from '../../components/common';
import StatCard from '../../components/common/StatCard';
import { getSaladasReport, SaladasPeriod, SaladasReport } from '../../services/saladasReport';
import { getStoreSlug } from '../../hooks/useStore';
import { requireStoreSlug } from '../../config/storeConfig';
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PERIOD_OPTIONS: { label: string; value: SaladasPeriod }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Semana', value: '7d' },
  { label: 'Mês', value: '30d' },
];

const PIE_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];
const MEDALS = ['🥇', '🥈', '🥉'];

const SaladasDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<SaladasPeriod>('today');
  const [data, setData] = useState<SaladasReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getSaladasReport(period));
    } catch {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = () => {
    const store = requireStoreSlug(getStoreSlug());
    const periodMap: Record<SaladasPeriod, string> = { today: '1d', '7d': '7d', '30d': '30d' };
    const base = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('auth_token') || '';
    const url = `${base}/stores/reports/orders/export/?store=${store}&period=${periodMap[period]}`;
    const a = document.createElement('a');
    a.href = url;
    if (token) a.setAttribute('data-token', token);
    a.setAttribute('download', `saladas_${period}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const kpis = data?.kpis;
  const maxQty = data?.top_products?.[0]?.quantity ?? 1;
  const maxNeighborhood = data?.top_neighborhoods?.[0]?.orders ?? 1;
  const periodLabel = data?.period?.label ?? '—';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">🥗 Ce-Saladas — Dashboard</h1>
          <p className="text-sm text-fg-muted mt-0.5">Análise de vendas e performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  period === opt.value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-fg-muted hover:text-fg-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-primary rounded-lg hover:bg-bg-hover transition-colors text-fg-secondary"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-primary rounded-lg hover:bg-bg-hover transition-colors text-fg-secondary disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-sm text-red-500 hover:underline">Fechar</button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Row 1: KPI cards */}
        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-4">
          {/* Faturamento — card verde destaque */}
          <div className={`rounded-xl p-4 flex justify-between items-start hover:shadow-md transition-shadow ${
            loading ? 'bg-bg-card border border-border-primary' : 'bg-gradient-to-br from-green-600 to-green-500'
          }`}>
            <div className="flex flex-col gap-1">
              <span className={`text-sm ${loading ? 'text-fg-muted' : 'text-green-100'}`}>
                Faturamento · {periodLabel}
              </span>
              {loading
                ? <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                : <span className="text-3xl font-extrabold text-white">{fmt(kpis?.revenue.value ?? 0)}</span>}
              {!loading && kpis?.revenue.change_percent != null && (
                <span className={`text-sm ${kpis.revenue.change_percent >= 0 ? 'text-green-100' : 'text-red-200'}`}>
                  {kpis.revenue.change_percent >= 0 ? '▲' : '▼'} {Math.abs(kpis.revenue.change_percent).toFixed(1)}% vs anterior
                </span>
              )}
            </div>
            <div className={`p-2 rounded-xl ${loading ? 'bg-bg-secondary text-green-500' : 'bg-white/20'}`}>
              <CurrencyDollarIcon className={`w-6 h-6 ${loading ? '' : 'text-white'}`} />
            </div>
          </div>

          <StatCard
            title={`Pedidos · ${periodLabel}`}
            value={kpis?.orders.value ?? 0}
            change={kpis?.orders.change_abs}
            changeIsAbsolute
            icon={ShoppingCartIcon}
            iconClass="text-blue-500"
            loading={loading}
          />
          <StatCard
            title="Ticket Médio"
            value={fmt(kpis?.avg_ticket.value ?? 0)}
            icon={ArrowTrendingUpIcon}
            iconClass="text-indigo-500"
            loading={loading}
          />
        </div>

        {/* Row 2: Gráfico + Categorias */}
        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-6">
          <Card className="col-span-2">
            <h2 className="text-base font-semibold text-fg-primary mb-4">
              Faturamento — {periodLabel}
            </h2>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (data?.revenue_chart?.length ?? 0) === 0 ? (
              <p className="text-sm text-fg-muted text-center py-12">Sem dados de faturamento neste período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data!.revenue_chart} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} stroke="#6b7280" fontSize={11} />
                  <RechartsTooltip
                    formatter={(v: number | undefined) => [fmt(v ?? 0), 'Faturamento']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-fg-primary mb-4">Por categoria</h2>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (data?.category_revenue?.length ?? 0) === 0 ? (
              <p className="text-sm text-fg-muted text-center py-8">Sem dados de categoria.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={data!.category_revenue} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                      {data!.category_revenue.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
                  {data!.category_revenue.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-fg-secondary truncate flex-1">{c.name}</span>
                      <span className="text-xs font-medium text-fg-primary">{c.percent}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Row 3: Top saladas + Clientes/Bairros */}
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          <Card>
            <h2 className="text-base font-semibold text-fg-primary mb-4">
              🥗 Top Saladas — {periodLabel}
            </h2>
            {loading ? (
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (data?.top_products?.length ?? 0) === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum produto vendido neste período.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data!.top_products.slice(0, 8).map((p, i) => {
                  const pct = Math.round((p.quantity / maxQty) * 100);
                  const barColor = i === 0 ? '#16a34a' : i === 1 ? '#2563eb' : i === 2 ? '#f59e0b' : '#9ca3af';
                  return (
                    <div key={p.name}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-medium text-fg-primary">
                          {MEDALS[i] ?? `${i + 1}.`} {p.name}
                        </span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {p.quantity}x · {fmt(p.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-secondary rounded-full">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="text-base font-semibold text-fg-primary mb-3">
                👥 Clientes — {periodLabel}
              </h2>
              {loading ? (
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{data?.customers.total ?? 0}</p>
                    <p className="text-xs text-fg-muted mt-0.5">Total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">+{data?.customers.new ?? 0}</p>
                    <p className="text-xs text-fg-muted mt-0.5">Novos</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{data?.customers.returning ?? 0}</p>
                    <p className="text-xs text-fg-muted mt-0.5">Recorrentes</p>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-fg-primary mb-3">📍 Top Bairros</h2>
              {loading ? (
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : (data?.top_neighborhoods?.length ?? 0) === 0 ? (
                <p className="text-sm text-fg-muted">Sem dados de entrega neste período.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data!.top_neighborhoods.slice(0, 6).map((n) => (
                    <div key={n.name} className="flex items-center gap-3">
                      <span className="text-sm text-fg-primary w-28 truncate">{n.name}</span>
                      <div className="flex-1 h-1.5 bg-bg-secondary rounded-full">
                        <div
                          className="h-1.5 bg-blue-500 rounded-full"
                          style={{ width: `${Math.round((n.orders / maxNeighborhood) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-fg-primary w-5 text-right">{n.orders}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Row 4: Top clientes */}
        <Card>
          <h2 className="text-base font-semibold text-fg-primary mb-4">
            🏆 Top Clientes — {periodLabel}
          </h2>
          {loading ? (
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : (data?.top_customers?.length ?? 0) === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum cliente encontrado neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="pb-2 text-left text-fg-muted font-medium px-2">Cliente</th>
                    <th className="pb-2 text-left text-fg-muted font-medium px-2">WhatsApp</th>
                    <th className="pb-2 text-right text-fg-muted font-medium px-2">Pedidos</th>
                    <th className="pb-2 text-right text-fg-muted font-medium px-2">Total gasto</th>
                    <th className="pb-2 text-right text-fg-muted font-medium px-2">Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_customers.map((c, i) => (
                    <tr key={`${c.phone}-${i}`} className="border-b border-border-primary last:border-0">
                      <td className="py-2 px-2 font-medium text-fg-primary">{c.name || 'Cliente'}</td>
                      <td className="py-2 px-2 text-fg-muted">{c.phone || '—'}</td>
                      <td className="py-2 px-2 text-right text-fg-primary">{c.orders}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-600 dark:text-green-400">{fmt(c.total_spent)}</td>
                      <td className="py-2 px-2 text-right text-fg-primary">{fmt(c.avg_ticket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SaladasDashboardPage;
