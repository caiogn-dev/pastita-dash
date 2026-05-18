# Ce-Saladas Dashboard — Design Spec

**Data:** 2026-05-18  
**Rota:** `/analytics/saladas`  
**Projeto:** pastita-dash (frontend) + server2 (backend)

---

## Objetivo

Página de analytics dedicada ao Ce-Saladas para o dono acompanhar vendas do dia, semana e mês com métricas de produtos, clientes e entregas — tudo filtrável por período sem trocar de aba.

---

## Arquitetura

### Frontend

Nova rota `/analytics/saladas` com componente `SaladasDashboardPage.tsx` em `src/pages/reports/SaladasDashboardPage.tsx`. Adicionada ao router em `App.tsx` e ao menu lateral (sidebar) como sub-item de "Relatórios".

Componente reutiliza:
- `StatCard` (já existe em `AnalyticsPage.tsx` — extrair para `src/components/common/StatCard.tsx`)
- `Card` de `src/components/common`
- `BarChart` / `PieChart` via Recharts (já instalado)

### Backend

Um novo endpoint em `server2`:

```
GET /stores/reports/saladas/?store=ce-saladas&period=today|7d|30d
```

Retorna todos os KPIs numa única chamada para minimizar requests. O frontend faz 1 request por troca de período.

---

## Filtro de Período

Pills no header da página: **Hoje · Semana · Mês**

| Pill | Parâmetro | Comparação |
|------|-----------|------------|
| Hoje | `period=today` | vs ontem |
| Semana | `period=7d` | vs semana anterior |
| Mês | `period=30d` | vs mês anterior |

Trocar o pill dispara nova chamada ao endpoint. Sem debounce — resposta é rápida (query SQL simples).

---

## KPIs e Fonte de Dados

| KPI | Modelo | Campo | Cálculo |
|-----|--------|-------|---------|
| Faturamento | `StoreOrder` | `total` | `Sum(total)` onde `payment_status='paid'` |
| Nº de pedidos | `StoreOrder` | `id` | `Count(id)` no período |
| Ticket médio | `StoreOrder` | `total` | `Avg(total)` onde `payment_status='paid'` |
| Top saladas | `StoreOrderItem` | `product_name`, `quantity` | `Count` + `Sum(subtotal)` agrupado por produto |
| Receita por categoria | `StoreOrderItem` → `StoreProduct` → `StoreCategory` | `category.name` | `Sum(subtotal)` por categoria |
| Novos vs Recorrentes | `StoreCustomer` | `total_orders` | Novos = `total_orders == 1` no período |
| Top clientes | `StoreCustomer` | `total_spent`, `total_orders` | Top 10 por `total_spent` |
| Bairros | `StoreOrder` | `delivery_address['neighborhood']` | `Count` agrupado por bairro |

Variação percentual calculada no backend: `(atual - anterior) / anterior * 100`.

---

## Layout da Página

```
┌─────────────────────────────────────────────────────────────┐
│ 🥗 Ce-Saladas — Dashboard        [Hoje] [Semana] [Mês] [CSV]│
├─────────────────────────────────────────────────────────────┤
│  [Faturamento ▲12%]   [Pedidos ▲4]    [Ticket Médio]        │
├─────────────────────────────────────────────────────────────┤
│  [Gráfico barras 7 dias ──────────────] [Donut categorias]  │
├─────────────────────────────────────────────────────────────┤
│  [Top Saladas c/ barra progresso]  [Clientes] [Bairros]     │
├─────────────────────────────────────────────────────────────┤
│  [Tabela Top Clientes]                                       │
└─────────────────────────────────────────────────────────────┘
```

- **Grid 3 colunas** nos KPI cards (responsivo: 1 col no mobile)
- **Grid 2fr+1fr** no gráfico + donut
- **Grid 1fr+1fr** no ranking + clientes/bairros
- Faturamento card com `background: linear-gradient(135deg, #16a34a, #22c55e)` para destaque visual

---

## Novo Endpoint Backend

**Arquivo:** `server2/apps/stores/api/export_views.py`  
**Classe:** `SaladasReportView(BaseExportView)`  
**URL:** `stores/urls.py` → `path('reports/saladas/', SaladasReportView.as_view(), name='saladas-report')`

### Response shape

```json
{
  "period": { "label": "Hoje", "start": "2026-05-18", "end": "2026-05-18" },
  "kpis": {
    "revenue": { "value": 342.00, "change_percent": 12.0 },
    "orders": { "value": 23, "change_abs": 4 },
    "avg_ticket": { "value": 14.87, "change_percent": 0.0 }
  },
  "revenue_chart": [
    { "label": "Seg", "value": 210.00 },
    ...
  ],
  "top_products": [
    { "name": "Cesar", "quantity": 17, "revenue": 178.00 },
    ...
  ],
  "category_revenue": [
    { "name": "Saladas", "revenue": 188.10, "percent": 55 },
    ...
  ],
  "customers": {
    "total": 23, "new": 5, "returning": 18
  },
  "top_customers": [
    { "name": "Ana Paula S.", "phone": "...", "orders": 12, "total_spent": 189.50, "avg_ticket": 15.79 },
    ...
  ],
  "top_neighborhoods": [
    { "name": "Centro", "orders": 8 },
    ...
  ]
}
```

### Lógica de período

| `period` | Janela | Comparação | `revenue_chart` granularidade |
|----------|--------|------------|-------------------------------|
| `today` | `created_at__date = today` | vs ontem | por hora (0–23h) |
| `7d` | `created_at__date__gte = today - 7d` | vs semana anterior | por dia (Seg–Dom) |
| `30d` | `created_at__date__gte = today - 30d` | vs mês anterior | por dia (últimos 30) |

---

## Frontend — Novo Serviço

**Arquivo:** `src/services/saladasReport.ts`

```ts
export interface SaladasReport { ... }
export const getSaladasReport = (period: 'today' | '7d' | '30d') =>
  api.get('/stores/reports/saladas/', { params: { store: getStoreSlug(), period } });
// getStoreSlug() importado de src/hooks/useStore — mesmo padrão dos outros serviços
```

---

## Navegação

Adicionar no menu lateral (`Sidebar` ou equivalente) em "Relatórios":
- Relatórios (existente)
  - Visão Geral
  - **Ce-Saladas** ← novo item → `/analytics/saladas`

---

## Exportação CSV

Botão "↓ CSV" no header chama o endpoint existente `GET /stores/reports/orders/export/?store=ce-saladas&period=...` — já implementado, só precisa passar o parâmetro de período correto.

---

## O que NÃO está no escopo

- Editar a `AnalyticsPage.tsx` existente
- Autenticação/permissões (herdadas da infra atual)
- Modo dark (segue o tema global já existente)
- Filtro por data customizada (fora do escopo desta versão)
