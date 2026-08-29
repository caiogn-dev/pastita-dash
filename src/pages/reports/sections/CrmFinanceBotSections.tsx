/**
 * Seções de clientes (RFM + inativos acionáveis), financeiro (taxas de
 * gateway + ROI de cupom) e bot/avaliações.
 */
import React from 'react';
import { StatCard, Badge } from '../../../components/ui';
import type {
  RfmReport, FinanceReport, CouponsReport, BotFunnelReport, ReviewsReport, CohortReport, DateRange,
} from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { Link } from 'react-router-dom';
import { SectionCard, EmptyNote, RankedList, ExportCsvButton, formatBRL, paymentLabel } from './shared';

// ─── Clientes (RFM + inativos) ───────────────────────────────────────────────

const SEGMENT_HINTS: Record<string, string> = {
  campeoes: 'Pedem sempre e há pouco tempo — cuide bem',
  leais: 'Recorrentes ativos',
  novos: 'Primeiro pedido recente — hora do 2º pedido',
  em_risco: 'Recorrentes sumindo — reengajar agora',
  perdidos: 'Sem pedido há 120+ dias',
  sem_pedido: 'Cadastro sem compra',
};

const SEGMENT_BADGE: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  campeoes: { label: 'Campeão', tone: 'success' },
  leais: { label: 'Leal', tone: 'success' },
  novos: { label: 'Novo', tone: 'neutral' },
  em_risco: { label: 'Em risco', tone: 'warning' },
  perdidos: { label: 'Perdido', tone: 'danger' },
  sem_pedido: { label: 'Sem pedido', tone: 'neutral' },
};

export const CrmSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<RfmReport>('rfm', range, enabled);
  const segments = q.data?.segments ?? [];
  const inactive = q.data?.inactive ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Segmentos RFM" subtitle="Recência × frequência × valor (base inteira da loja)" loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()}>
        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {segments.map((s) => (
            <StatCard
              key={s.segment}
              label={s.label}
              value={s.count}
              sub={`${formatBRL(s.revenue)} · ${SEGMENT_HINTS[s.segment] || ''}`}
              tone={s.segment === 'campeoes' ? 'brand' : s.segment === 'em_risco' ? 'warning' : 'default'}
            />
          ))}
          <StatCard
            label="Cadência de compra"
            value={
              q.data?.cadence?.avg_days_between_orders != null
                ? `a cada ${q.data.cadence.avg_days_between_orders}d`
                : '—'
            }
            sub={`gap médio entre pedidos · ${q.data?.cadence?.customers_with_repeat ?? 0} clientes recorrentes`}
            tone="brand"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Cada cliente em números"
        subtitle="Pedidos, gasto, ticket e ritmo de compra individuais — a média da base está no card Cadência acima"
        loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()}
        action={
          <ExportCsvButton
            rows={q.data?.customers ?? []}
            columns={[
              { key: 'name', label: 'Cliente' }, { key: 'phone', label: 'Telefone' },
              { key: 'segment', label: 'Segmento' }, { key: 'total_orders', label: 'Pedidos' },
              { key: 'total_spent', label: 'Total gasto' }, { key: 'avg_ticket', label: 'Ticket médio' },
              { key: 'typical_gap_days', label: 'Pede a cada (dias)' }, { key: 'days_since', label: 'Dias desde o último' },
            ]}
            filename="clientes_metricas.csv"
          />
        }
      >
        {(q.data?.customers?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhum cliente com pedido ainda." />
        ) : (
          <RankedList
            items={(q.data?.customers ?? []).slice(0, 20).map((c) => {
              const badge = SEGMENT_BADGE[c.segment];
              return {
                label: c.name || c.phone || 'Cliente',
                badge: badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : undefined,
                sub: [
                  `${c.total_orders} pedido${c.total_orders > 1 ? 's' : ''}`,
                  `ticket ${formatBRL(c.avg_ticket)}`,
                  c.typical_gap_days ? `pede a cada ~${c.typical_gap_days}d` : null,
                  c.days_since != null ? `último há ${c.days_since}d` : null,
                ].filter(Boolean).join(' · '),
                value: c.total_spent,
                valueLabel: formatBRL(c.total_spent),
                danger: c.segment === 'perdidos',
              };
            })}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Clientes para reengajar"
        subtitle="Sem pedir há 60+ dias, ordenados por valor histórico — um toque no WhatsApp resolve"
        loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()}
        action={
          <ExportCsvButton
            rows={inactive}
            columns={[
              { key: 'name', label: 'Cliente' }, { key: 'phone', label: 'Telefone' },
              { key: 'days_since', label: 'Dias sem pedir' }, { key: 'total_orders', label: 'Pedidos' },
              { key: 'total_spent', label: 'Total gasto' },
            ]}
            filename="clientes_inativos.csv"
          />
        }
      >
        {inactive.length === 0 ? (
          <EmptyNote text="Ninguém sumido há 60+ dias. 🎉" />
        ) : (
          <RankedList
            items={inactive.slice(0, 25).map((c) => ({
              label: c.name || c.phone,
              sub: [
                `${c.days_since} dias sem pedir`,
                `${c.total_orders} pedido${c.total_orders > 1 ? 's' : ''}`,
                c.typical_gap_days ? `pedia a cada ~${c.typical_gap_days}d` : null,
                c.overdue_factor && c.overdue_factor >= 2 ? `${c.overdue_factor.toFixed(0)}× atrasado` : null,
              ].filter(Boolean).join(' · '),
              value: c.total_spent,
              valueLabel: formatBRL(c.total_spent),
              danger: c.days_since >= 120,
              actions: c.phone ? (
                <span className="flex items-center gap-2 justify-end mt-0.5 text-xs">
                  <Link
                    to={`/inbox/whatsapp?search=${encodeURIComponent(c.phone.replace(/\D/g, ''))}`}
                    className="text-brand-ink font-semibold hover:underline"
                    title="Abrir conversa no inbox"
                  >
                    Conversa
                  </Link>
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-ink font-semibold hover:underline"
                    title="Chamar no WhatsApp"
                  >
                    Chamar
                  </a>
                </span>
              ) : undefined,
            }))}
          />
        )}
      </SectionCard>
    </div>
  );
};

export const CohortSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<CohortReport>('cohort', range, enabled);
  const cohorts = q.data?.cohorts ?? [];
  const horizon = q.data?.horizon ?? 5;

  return (
    <SectionCard
      title="Retenção por safra"
      subtitle="% dos clientes do 1º pedido em cada mês que voltaram nos meses seguintes"
      loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()}
    >
      {cohorts.length === 0 ? (
        <EmptyNote text="Ainda não há clientes suficientes para montar safras." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-token">
                <th className="pb-2 px-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted-token">Safra</th>
                <th className="pb-2 px-2 text-right text-xs font-semibold uppercase tracking-wide text-fg-muted-token">Clientes</th>
                {Array.from({ length: horizon }, (_, i) => (
                  <th key={i} className="pb-2 px-2 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted-token">
                    M+{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohort} className="border-b border-border-token/40 last:border-0">
                  <td className="py-2 px-2 font-medium text-fg-token">{c.cohort}</td>
                  <td className="py-2 px-2 text-right text-fg-token tabular-nums">{c.size}</td>
                  {c.retention.map((pct, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      {pct == null ? (
                        <span className="text-fg-muted-token">—</span>
                      ) : (
                        <span
                          className="inline-block min-w-[3.2rem] rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums text-fg-token"
                          style={{ backgroundColor: `color-mix(in srgb, var(--brand) ${Math.max(8, Math.min(pct, 100))}%, transparent)` }}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};

// ─── Financeiro (taxas + cupons) ─────────────────────────────────────────────

export const FinanceSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const fin = useAnalyticsReport<FinanceReport>('finance', range, enabled);
  const coupons = useAnalyticsReport<CouponsReport>('coupons', range, enabled);
  const s = fin.data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Recebido × taxas" subtitle="Pagamentos aprovados no gateway (MercadoPago)" loading={fin.isLoading} error={fin.isError} onRetry={() => fin.refetch()}>
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <StatCard label="Bruto" value={formatBRL(s?.gross ?? 0)} tone="brand" />
          <StatCard label="Taxas de gateway" value={formatBRL(s?.fees ?? 0)} tone="warning" />
          <StatCard label="Líquido" value={formatBRL(s?.net ?? 0)} />
          <StatCard label="Reembolsado" value={formatBRL(s?.refunded ?? 0)} />
        </div>
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-fg-muted-token mb-3">Por método</h3>
            <RankedList
              medals={false}
              items={(fin.data?.by_method ?? []).map((r) => ({
                label: paymentLabel(r.payment_method),
                sub: `${r.count} pagamentos`,
                value: Number(r.net),
                valueLabel: formatBRL(Number(r.net)),
              }))}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg-muted-token mb-3">Por gateway</h3>
            <RankedList
              medals={false}
              items={(fin.data?.by_gateway ?? []).map((r) => ({
                label: paymentLabel(r.gateway),
                sub: `${r.count} pagamentos`,
                value: Number(r.net),
                valueLabel: formatBRL(Number(r.net)),
              }))}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cupons"
        subtitle={coupons.data ? `${coupons.data.summary.coupon_usage_pct}% dos pedidos usaram cupom · ${formatBRL(coupons.data.summary.total_discount)} em descontos` : undefined}
        loading={coupons.isLoading} error={coupons.isError} onRetry={() => coupons.refetch()}
        action={
          <ExportCsvButton
            rows={coupons.data?.coupons ?? []}
            columns={[
              { key: 'code', label: 'Código' }, { key: 'orders', label: 'Usos' },
              { key: 'discount_total', label: 'Desconto dado' }, { key: 'revenue', label: 'Receita gerada' },
              { key: 'avg_ticket', label: 'Ticket médio' },
            ]}
            filename="cupons.csv"
          />
        }
      >
        {(coupons.data?.coupons?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhum cupom usado no período." />
        ) : (
          <RankedList
            items={(coupons.data?.coupons ?? []).map((c) => ({
              label: c.code,
              sub: `${c.orders} uso${c.orders > 1 ? 's' : ''} · ${formatBRL(c.discount_total)} em desconto · ticket ${formatBRL(c.avg_ticket)}`,
              value: c.revenue,
              valueLabel: formatBRL(c.revenue),
            }))}
          />
        )}
      </SectionCard>
    </div>
  );
};

// ─── Bot + Avaliações ────────────────────────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = {
  active: 'Conversando',
  cart_created: 'Carrinho criado',
  cart_abandoned: 'Carrinho abandonado',
  checkout: 'Em checkout',
  payment_pending: 'Aguardando pagamento',
  payment_confirmed: 'Pagamento confirmado',
  order_placed: 'Pedido realizado',
  completed: 'Concluída',
  expired: 'Expirada',
};

export const BotReviewsSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const bot = useAnalyticsReport<BotFunnelReport>('bot-funnel', range, enabled);
  const reviews = useAnalyticsReport<ReviewsReport>('reviews', range, enabled);
  const conv = bot.data?.conversion;
  const rt = bot.data?.response_time;
  const rsum = reviews.data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Funil do bot" subtitle="Sessões de conversa → pedido no período" loading={bot.isLoading} error={bot.isError} onRetry={() => bot.refetch()}>
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 mb-6">
          <StatCard label="Sessões" value={conv?.sessions ?? 0} />
          <StatCard label="Viraram pedido" value={conv?.with_order ?? 0} sub={`${conv?.rate ?? 0}% de conversão`} tone="brand" />
          <StatCard
            label="Tempo de resposta"
            value={rt?.avg_minutes != null ? `${rt.avg_minutes}min` : '—'}
            sub={rt?.conversations ? `${rt.conversations} conversas` : 'sem dados'}
          />
        </div>
        {(bot.data?.funnel?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhuma sessão de bot no período." />
        ) : (
          <RankedList
            medals={false}
            items={(bot.data?.funnel ?? []).map((f) => ({
              label: FUNNEL_LABELS[f.status] || f.status,
              value: f.count,
              valueLabel: `${f.count} ${f.count > 1 ? 'sessões' : 'sessão'}`,
              danger: f.status === 'cart_abandoned' || f.status === 'expired',
            }))}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Avaliações"
        subtitle={rsum?.count ? `Nota média ${rsum.avg_rating?.toFixed(1)} ★ em ${rsum.count} avaliações` : undefined}
        loading={reviews.isLoading} error={reviews.isError} onRetry={() => reviews.refetch()}
        action={
          <ExportCsvButton
            rows={reviews.data?.by_product ?? []}
            columns={[
              { key: 'product_name', label: 'Produto' },
              { key: 'avg_rating', label: 'Nota média' },
              { key: 'count', label: 'Avaliações' },
            ]}
            filename="notas_por_produto.csv"
          />
        }
      >
        {(rsum?.count ?? 0) === 0 ? (
          <EmptyNote text="Nenhuma avaliação no período." />
        ) : (
          <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
            <RankedList
              medals={false}
              items={(reviews.data?.distribution ?? []).map((d) => ({
                label: `${d.rating} ★`,
                value: d.count,
                valueLabel: `${d.count}`,
                danger: d.rating <= 2,
              }))}
            />
            <div className="flex flex-col gap-4">
              {(reviews.data?.by_product?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-fg-muted-token mb-2">
                    Nota por produto (piores primeiro)
                  </h3>
                  <RankedList
                    medals={false}
                    max={5}
                    items={(reviews.data?.by_product ?? []).slice(0, 10).map((p) => ({
                      label: p.product_name,
                      sub: `${p.count} avaliaç${p.count > 1 ? 'ões' : 'ão'}`,
                      value: p.avg_rating,
                      valueLabel: `${p.avg_rating.toFixed(1)} ★`,
                      danger: p.avg_rating < 3.5,
                    }))}
                  />
                </div>
              )}
              {(reviews.data?.recent ?? []).filter((r) => r.comment).slice(0, 5).map((r, i) => (
                <div key={i} className="border border-border-token rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={r.rating >= 4 ? 'success' : r.rating >= 3 ? 'warning' : 'danger'}>{r.rating} ★</Badge>
                    <span className="text-xs text-fg-muted-token">{r.customer_name}</span>
                  </div>
                  <p className="text-sm text-fg-token">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
