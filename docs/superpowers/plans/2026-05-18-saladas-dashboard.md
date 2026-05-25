# Ce-Saladas Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/analytics/saladas` no pastita-dash com KPIs de vendas do Ce-Saladas filtráveis por período (Hoje/Semana/Mês), alimentada por um novo endpoint backend.

**Architecture:** 1 endpoint novo em server2 que retorna todos os KPIs em uma chamada. Frontend tem 1 serviço, 1 página, e adiciona entrada no sidebar. `StatCard` é extraído da `AnalyticsPage` para ser compartilhado.

**Tech Stack:** Django/DRF (backend), React 18 + TypeScript + Tailwind + Recharts (frontend)

---

## File Map

| Ação | Arquivo |
|------|---------|
| Modify | `server2/apps/stores/api/export_views.py` — nova classe `SaladasReportView` |
| Modify | `server2/apps/stores/urls.py` — registrar URL |
| Create | `pastita-dash/src/components/common/StatCard.tsx` — extraído de AnalyticsPage |
| Modify | `pastita-dash/src/pages/reports/AnalyticsPage.tsx` — importar StatCard em vez de definir local |
| Create | `pastita-dash/src/services/saladasReport.ts` — chamada ao novo endpoint |
| Create | `pastita-dash/src/pages/reports/SaladasDashboardPage.tsx` — página completa |
| Modify | `pastita-dash/src/pages/reports/index.ts` — exportar nova página |
| Modify | `pastita-dash/src/App.tsx` — adicionar rota `/analytics/saladas` |
| Modify | `pastita-dash/src/components/layout/Sidebar.tsx` — adicionar entrada "Relatórios" com sub-items |

---

## Task 1: Backend — Endpoint `/stores/reports/saladas/`

**Files:**
- Modify: `server2/apps/stores/api/export_views.py`
- Modify: `server2/apps/stores/urls.py`

- [ ] **Step 1.1: Adicionar `SaladasReportView` em `export_views.py`**

Abrir `server2/apps/stores/api/export_views.py`. Adicionar no final do arquivo (antes do EOF):

```python
class SaladasReportView(BaseExportView):
    """KPIs consolidados para o dashboard do Ce-Saladas."""

    def get(self, request):
        store = self.get_store(request)
        if not store:
            return Response({'error': 'Store parameter required'}, status=400)

        period = request.query_params.get('period', 'today')
        today = timezone.now().date()

        if period == 'today':
            start = today
            end = today
            prev_start = today - timedelta(days=1)
            prev_end = today - timedelta(days=1)
            period_label = 'Hoje'
        elif period == '7d':
            start = today - timedelta(days=6)
            end = today
            prev_start = today - timedelta(days=13)
            prev_end = today - timedelta(days=7)
            period_label = 'Semana'
        else:  # 30d
            start = today - timedelta(days=29)
            end = today
            prev_start = today - timedelta(days=59)
            prev_end = today - timedelta(days=30)
            period_label = 'Mês'

        paid_orders = StoreOrder.objects.filter(
            store=store,
            created_at__date__gte=start,
            created_at__date__lte=end,
            payment_status='paid',
        )
        prev_paid_orders = StoreOrder.objects.filter(
            store=store,
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end,
            payment_status='paid',
        )

        # KPIs principais
        curr = paid_orders.aggregate(
            revenue=Sum('total'),
            orders=Count('id'),
            avg_ticket=Avg('total'),
        )
        prev = prev_paid_orders.aggregate(
            revenue=Sum('total'),
            orders=Count('id'),
        )

        def pct_change(curr_val, prev_val):
            if prev_val and prev_val > 0:
                return round(float((curr_val - prev_val) / prev_val * 100), 1)
            return None

        curr_revenue = float(curr['revenue'] or 0)
        prev_revenue = float(prev['revenue'] or 0)
        curr_orders = curr['orders'] or 0
        prev_orders = prev['orders'] or 0

        # Gráfico de barras — agrupado por dia
        from django.db.models.functions import TruncDate
        chart_data = (
            paid_orders
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(value=Sum('total'))
            .order_by('day')
        )
        revenue_chart = [
            {
                'label': item['day'].strftime('%d/%m'),
                'value': float(item['value'] or 0),
            }
            for item in chart_data
        ]

        # Top produtos
        from apps.stores.models import StoreOrderItem
        top_products_qs = (
            StoreOrderItem.objects.filter(order__in=paid_orders)
            .values('product_name')
            .annotate(quantity=Sum('quantity'), revenue=Sum('subtotal'))
            .order_by('-quantity')[:10]
        )
        top_products = [
            {
                'name': p['product_name'],
                'quantity': p['quantity'],
                'revenue': float(p['revenue'] or 0),
            }
            for p in top_products_qs
        ]

        # Receita por categoria
        from apps.stores.models import StoreProduct
        cat_qs = (
            StoreOrderItem.objects.filter(order__in=paid_orders)
            .filter(product__isnull=False)
            .values('product__category__name')
            .annotate(revenue=Sum('subtotal'))
            .order_by('-revenue')
        )
        total_cat_revenue = sum(float(c['revenue'] or 0) for c in cat_qs)
        category_revenue = [
            {
                'name': c['product__category__name'] or 'Sem categoria',
                'revenue': float(c['revenue'] or 0),
                'percent': round(float(c['revenue'] or 0) / total_cat_revenue * 100) if total_cat_revenue > 0 else 0,
            }
            for c in cat_qs
        ]

        # Clientes: novos vs recorrentes
        # Novos = clientes que fizeram seu 1º pedido no período
        from apps.stores.models import StoreCustomer
        period_phones = set(paid_orders.values_list('customer_phone', flat=True))
        total_period_customers = len(period_phones)

        returning = (
            StoreOrder.objects.filter(
                store=store,
                payment_status='paid',
                customer_phone__in=period_phones,
                created_at__date__lt=start,
            )
            .values('customer_phone')
            .distinct()
            .count()
        )
        new_customers = total_period_customers - returning

        # Top clientes por gasto
        top_customers_qs = (
            paid_orders
            .values('customer_name', 'customer_phone')
            .annotate(
                total_spent=Sum('total'),
                order_count=Count('id'),
                avg_ticket=Avg('total'),
            )
            .order_by('-total_spent')[:10]
        )
        top_customers = [
            {
                'name': c['customer_name'],
                'phone': c['customer_phone'],
                'orders': c['order_count'],
                'total_spent': float(c['total_spent'] or 0),
                'avg_ticket': float(c['avg_ticket'] or 0),
            }
            for c in top_customers_qs
        ]

        # Top bairros
        all_orders_period = StoreOrder.objects.filter(
            store=store,
            created_at__date__gte=start,
            created_at__date__lte=end,
            delivery_method='delivery',
        )
        neighborhoods: dict = {}
        for order in all_orders_period.only('delivery_address'):
            addr = order.delivery_address or {}
            neighborhood = addr.get('neighborhood') or addr.get('bairro') or ''
            if neighborhood:
                neighborhoods[neighborhood] = neighborhoods.get(neighborhood, 0) + 1

        top_neighborhoods = [
            {'name': n, 'orders': cnt}
            for n, cnt in sorted(neighborhoods.items(), key=lambda x: -x[1])[:10]
        ]

        return Response({
            'period': {
                'label': period_label,
                'start': start.isoformat(),
                'end': end.isoformat(),
            },
            'kpis': {
                'revenue': {
                    'value': curr_revenue,
                    'change_percent': pct_change(curr_revenue, prev_revenue),
                },
                'orders': {
                    'value': curr_orders,
                    'change_abs': curr_orders - prev_orders,
                },
                'avg_ticket': {
                    'value': float(curr['avg_ticket'] or 0),
                    'change_percent': None,
                },
            },
            'revenue_chart': revenue_chart,
            'top_products': top_products,
            'category_revenue': category_revenue,
            'customers': {
                'total': total_period_customers,
                'new': new_customers,
                'returning': returning,
            },
            'top_customers': top_customers,
            'top_neighborhoods': top_neighborhoods,
        })
```

- [ ] **Step 1.2: Registrar URL em `stores/urls.py`**

Abrir `server2/apps/stores/urls.py`. Localizar o bloco de `reports/` e adicionar após `reports/customers/`:

```python
path('reports/saladas/', SaladasReportView.as_view(), name='saladas-report'),
```

Também adicionar `SaladasReportView` no import no topo do arquivo onde os outros views de report são importados. Buscar por:
```python
from .api.export_views import (
```
e adicionar `SaladasReportView` na lista.

- [ ] **Step 1.3: Deploy no container**

```bash
docker cp server2/apps/stores/api/export_views.py pastita_web:/app/apps/stores/api/export_views.py
docker cp server2/apps/stores/urls.py pastita_web:/app/apps/stores/urls.py
docker cp server2/apps/stores/api/export_views.py pastita_celery:/app/apps/stores/api/export_views.py
docker cp server2/apps/stores/urls.py pastita_celery:/app/apps/stores/urls.py
```

- [ ] **Step 1.4: Testar endpoint manualmente**

```bash
# Obter token
TOKEN=$(docker exec pastita_web python manage.py shell -c "from rest_framework.authtoken.models import Token; from django.contrib.auth import get_user_model; u=get_user_model().objects.filter(is_superuser=True).first(); t,_=Token.objects.get_or_create(user=u); print(t.key)")

curl -s "http://localhost:8000/stores/reports/saladas/?store=ce-saladas&period=today" \
  -H "Authorization: Token $TOKEN" | python3 -m json.tool | head -40
```

Esperado: JSON com `period`, `kpis`, `revenue_chart`, `top_products`, etc. Se der 404, verificar URL no urls.py.

- [ ] **Step 1.5: Commit backend**

```bash
cd server2
git add apps/stores/api/export_views.py apps/stores/urls.py
git commit -m "feat: endpoint /stores/reports/saladas/ com KPIs do Ce-Saladas"
```

---

## Task 2: Extrair `StatCard` para componente compartilhado

**Files:**
- Create: `pastita-dash/src/components/common/StatCard.tsx`
- Modify: `pastita-dash/src/pages/reports/AnalyticsPage.tsx`

- [ ] **Step 2.1: Criar `src/components/common/StatCard.tsx`**

```tsx
import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeSuffix?: string;
  changeIsAbsolute?: boolean;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeSuffix = '%',
  changeIsAbsolute = false,
  icon: Icon,
  iconClass = 'text-blue-500',
  loading,
}) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4 flex justify-between items-start hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-fg-muted">{title}</span>
        {loading ? (
          <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        ) : (
          <span className="text-2xl font-bold text-fg-primary">{value}</span>
        )}
        {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
        {change !== undefined && change !== null && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive
              ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              : <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}
              {changeIsAbsolute ? change : `${change.toFixed(1)}${changeSuffix}`}
            </span>
            <span className="text-xs text-fg-muted">vs anterior</span>
          </div>
        )}
      </div>
      <div className={`p-2 rounded-xl bg-bg-secondary ${iconClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default StatCard;
```

- [ ] **Step 2.2: Atualizar `AnalyticsPage.tsx` para importar StatCard**

Remover a definição local de `StatCard` e `StatCardProps` de `AnalyticsPage.tsx` (linhas ~42–79) e substituir por:

```tsx
import StatCard from '../../components/common/StatCard';
```

O componente exportado em `common/StatCard.tsx` tem os mesmos props, portanto nenhuma outra mudança é necessária.

- [ ] **Step 2.3: Verificar que AnalyticsPage ainda compila**

```bash
cd pastita-dash
npm run build 2>&1 | tail -20
```

Esperado: sem erros de tipo no StatCard.

---

## Task 3: Serviço frontend `saladasReport.ts`

**Files:**
- Create: `pastita-dash/src/services/saladasReport.ts`

- [ ] **Step 3.1: Criar o serviço**

```ts
import api from './api';
import { getStoreSlug } from '../hooks/useStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const getStoreParam = () => getStoreSlug() || STORE_SLUG;

export type SaladasPeriod = 'today' | '7d' | '30d';

export interface SaladasKpi {
  value: number;
  change_percent: number | null;
}

export interface SaladasOrdersKpi {
  value: number;
  change_abs: number;
}

export interface SaladasReport {
  period: { label: string; start: string; end: string };
  kpis: {
    revenue: SaladasKpi;
    orders: SaladasOrdersKpi;
    avg_ticket: SaladasKpi;
  };
  revenue_chart: { label: string; value: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  category_revenue: { name: string; revenue: number; percent: number }[];
  customers: { total: number; new: number; returning: number };
  top_customers: {
    name: string;
    phone: string;
    orders: number;
    total_spent: number;
    avg_ticket: number;
  }[];
  top_neighborhoods: { name: string; orders: number }[];
}

export const getSaladasReport = async (period: SaladasPeriod): Promise<SaladasReport> => {
  const response = await api.get('/stores/reports/saladas/', {
    params: { store: getStoreParam(), period },
  });
  return response.data;
};
```

---

## Task 4: Página `SaladasDashboardPage.tsx`

**Files:**
- Create: `pastita-dash/src/pages/reports/SaladasDashboardPage.tsx`

- [ ] **Step 4.1: Criar a página completa**

```tsx
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card } from '../../components/common';
import StatCard from '../../components/common/StatCard';
import { getSaladasReport, SaladasPeriod, SaladasReport } from '../../services/saladasReport';
import { getStoreSlug } from '../../hooks/useStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PERIOD_OPTIONS: { label: string; value: SaladasPeriod }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Semana', value: '7d' },
  { label: 'Mês', value: '30d' },
];

const PIE_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

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
    const store = getStoreSlug() || STORE_SLUG;
    const periodMap: Record<SaladasPeriod, string> = { today: '1d', '7d': '7d', '30d': '30d' };
    const token = localStorage.getItem('authToken') || '';
    const url = `${import.meta.env.VITE_API_URL || ''}/stores/reports/orders/export/?store=${store}&period=${periodMap[period]}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `saladas_${period}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const kpis = data?.kpis;
  const maxProduct = data?.top_products?.[0]?.quantity ?? 1;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">🥗 Ce-Saladas — Dashboard</h1>
          <p className="text-sm text-fg-muted mt-0.5">Análise de vendas e performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period pills */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-primary rounded-lg hover:bg-bg-hover transition-colors text-fg-secondary"
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
          <div className={`rounded-xl p-4 flex justify-between items-start ${loading ? 'bg-bg-card border border-border-primary' : 'bg-gradient-to-br from-green-600 to-green-500 text-white'}`}>
            <div className="flex flex-col gap-1">
              <span className={`text-sm ${loading ? 'text-fg-muted' : 'text-green-100'}`}>
                Faturamento · {data?.period?.label ?? '—'}
              </span>
              {loading
                ? <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                : <span className="text-3xl font-extrabold">{formatCurrency(kpis?.revenue.value ?? 0)}</span>}
              {!loading && kpis?.revenue.change_percent != null && (
                <span className="text-sm text-green-100">
                  {kpis.revenue.change_percent >= 0 ? '▲' : '▼'} {Math.abs(kpis.revenue.change_percent).toFixed(1)}% vs anterior
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-white/20">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>

          <StatCard
            title={`Pedidos · ${data?.period?.label ?? '—'}`}
            value={kpis?.orders.value ?? 0}
            change={kpis?.orders.change_abs}
            changeIsAbsolute
            changeSuffix=""
            icon={ShoppingCartIcon}
            iconClass="text-blue-500"
            loading={loading}
          />
          <StatCard
            title="Ticket Médio"
            value={formatCurrency(kpis?.avg_ticket.value ?? 0)}
            icon={ArrowTrendingUpIcon}
            iconClass="text-indigo-500"
            loading={loading}
          />
        </div>

        {/* Row 2: Bar chart + Donut */}
        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-6">
          <Card className="col-span-2">
            <h2 className="text-base font-semibold text-fg-primary mb-4">
              Faturamento — {data?.period?.label ?? ''}
            </h2>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.revenue_chart ?? []} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} stroke="#6b7280" fontSize={11} />
                  <RechartsTooltip
                    formatter={(v: number) => [formatCurrency(v), 'Faturamento']}
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
              <p className="text-sm text-fg-muted text-center py-8">Sem dados de categoria</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data!.category_revenue}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {data!.category_revenue.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Row 3: Top saladas + Clientes + Bairros */}
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          {/* Top saladas */}
          <Card>
            <h2 className="text-base font-semibold text-fg-primary mb-4">
              🥗 Top Saladas — {data?.period?.label ?? ''}
            </h2>
            {loading ? (
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (data?.top_products?.length ?? 0) === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum produto vendido neste período.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data!.top_products.slice(0, 8).map((p, i) => {
                  const pct = Math.round((p.quantity / maxProduct) * 100);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={p.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-fg-primary">
                          {medals[i] ?? `${i + 1}.`} {p.name}
                        </span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {p.quantity}x · {formatCurrency(p.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-secondary rounded-full">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: i === 0 ? '#16a34a' : i === 1 ? '#2563eb' : i === 2 ? '#f59e0b' : '#9ca3af',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Clientes + Bairros */}
          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="text-base font-semibold text-fg-primary mb-3">
                👥 Clientes — {data?.period?.label ?? ''}
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
                  {data!.top_neighborhoods.slice(0, 6).map((n) => {
                    const maxN = data!.top_neighborhoods[0].orders;
                    const pct = Math.round((n.orders / maxN) * 100);
                    return (
                      <div key={n.name} className="flex items-center gap-3">
                        <span className="text-sm text-fg-primary w-28 truncate">{n.name}</span>
                        <div className="flex-1 h-1.5 bg-bg-secondary rounded-full">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-fg-primary w-6 text-right">{n.orders}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Row 4: Top clientes */}
        <Card>
          <h2 className="text-base font-semibold text-fg-primary mb-4">
            🏆 Top Clientes — {data?.period?.label ?? ''}
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
                      <td className="py-2 px-2 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(c.total_spent)}</td>
                      <td className="py-2 px-2 text-right text-fg-primary">{formatCurrency(c.avg_ticket)}</td>
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
```

---

## Task 5: Wiring — rota e export

**Files:**
- Modify: `pastita-dash/src/pages/reports/index.ts`
- Modify: `pastita-dash/src/App.tsx`

- [ ] **Step 5.1: Exportar nova página em `index.ts`**

Adicionar linha no `src/pages/reports/index.ts`:

```ts
export { default as SaladasDashboardPage } from './SaladasDashboardPage';
```

- [ ] **Step 5.2: Adicionar import lazy em `App.tsx`**

Localizar o bloco de imports lazy de reports (perto da linha 58) e adicionar:

```tsx
const SaladasDashboardPage = lazy(() => import('./pages/reports').then(m => ({ default: m.SaladasDashboardPage })));
```

- [ ] **Step 5.3: Adicionar rota em `App.tsx`**

Localizar o bloco de `{/* Analytics/Reports Routes */}` (perto da linha 194) e adicionar após a rota `/analytics`:

```tsx
<Route path="analytics/saladas" element={<Suspense fallback={<FullPageLoading />}><SaladasDashboardPage /></Suspense>} />
```

---

## Task 6: Sidebar — link de navegação

**Files:**
- Modify: `pastita-dash/src/components/layout/Sidebar.tsx`

- [ ] **Step 6.1: Adicionar import do ícone**

No bloco de imports do `@heroicons/react/24/outline` em `Sidebar.tsx`, adicionar `PresentationChartLineIcon` se não existir:

```tsx
import {
  // ... imports existentes ...
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
```

- [ ] **Step 6.2: Adicionar seção "Análise" no sidebar**

Localizar `navigationSections` (linha ~69) e adicionar uma nova seção antes do objeto `Ferramentas`:

```tsx
{
  title: 'Análise',
  items: [
    {
      name: 'Relatórios',
      href: '/analytics',
      icon: PresentationChartLineIcon,
      children: [
        { name: 'Visão Geral', href: '/analytics', icon: PresentationChartLineIcon },
        { name: 'Ce-Saladas', href: '/analytics/saladas', icon: PresentationChartLineIcon },
      ],
    },
  ],
},
```

---

## Task 7: Build e deploy frontend

- [ ] **Step 7.1: Checar build sem erros**

```bash
cd pastita-dash
npm run build 2>&1 | tail -30
```

Esperado: `✓ built in Xs` sem erros TypeScript.

- [ ] **Step 7.2: Testar localmente (opcional)**

```bash
npm run dev
# Abrir http://localhost:5173/analytics/saladas
```

Verificar: pills de período funcionam, dados carregam, sem erros no console.

- [ ] **Step 7.3: Commit frontend**

```bash
cd pastita-dash
git add src/components/common/StatCard.tsx \
        src/pages/reports/SaladasDashboardPage.tsx \
        src/pages/reports/index.ts \
        src/pages/reports/AnalyticsPage.tsx \
        src/services/saladasReport.ts \
        src/App.tsx \
        src/components/layout/Sidebar.tsx
git commit -m "feat: página /analytics/saladas com KPIs do Ce-Saladas"
```

- [ ] **Step 7.4: Deploy em produção**

```bash
cd pastita-dash
npm run build
# Copiar dist/ para o servidor ou usar o processo de deploy existente
```
