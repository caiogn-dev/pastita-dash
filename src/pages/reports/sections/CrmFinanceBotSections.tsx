/**
 * Seções de clientes (RFM + inativos acionáveis), financeiro (taxas de
 * gateway + ROI de cupom) e bot/avaliações.
 */
import React from 'react';
import { StatCard, Badge } from '../../../components/ui';
import { RankBarList } from '../../../components/reports/RankBarList';
import type {
  RfmReport, FinanceReport, CouponsReport, BotFunnelReport, ReviewsReport, DateRange,
} from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { Link } from 'react-router-dom';
import { SectionCard, EmptyNote, MiniTable, ExportCsvButton, formatBRL, paymentLabel } from './shared';

// ─── Clientes (RFM + inativos) ───────────────────────────────────────────────

const SEGMENT_HINTS: Record<string, string> = {
  campeoes: 'Pedem sempre e há pouco tempo — cuide bem',
  leais: 'Recorrentes ativos',
  novos: 'Primeiro pedido recente — hora do 2º pedido',
  em_risco: 'Recorrentes sumindo — reengajar agora',
  perdidos: 'Sem pedido há 120+ dias',
  sem_pedido: 'Cadastro sem compra',
};

export const CrmSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<RfmReport>('rfm', range, enabled);
  const segments = q.data?.segments ?? [];
  const inactive = q.data?.inactive ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Segmentos RFM" subtitle="Recência × frequência × valor (base inteira da loja)" loading={q.isLoading}>
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
        </div>
      </SectionCard>

      <SectionCard
        title="Clientes para reengajar"
        subtitle="Sem pedir há 60+ dias, ordenados por valor histórico — um toque no WhatsApp resolve"
        loading={q.isLoading}
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
          <MiniTable
            headers={[
              { label: 'Cliente' }, { label: 'Dias sem pedir', align: 'right' },
              { label: 'Pedidos', align: 'right' }, { label: 'Total gasto', align: 'right' }, { label: '' },
            ]}
            rows={inactive.slice(0, 25).map((c) => [
              c.name || c.phone,
              c.days_since,
              c.total_orders,
              formatBRL(c.total_spent),
              c.phone ? (
                <span key="acts" className="flex items-center gap-3 justify-end">
                  <Link
                    to={`/inbox/whatsapp?search=${encodeURIComponent(c.phone.replace(/\D/g, ''))}`}
                    className="text-brand font-semibold hover:underline"
                    title="Abrir conversa no inbox"
                  >
                    Conversa
                  </Link>
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand font-semibold hover:underline"
                    title="Chamar no WhatsApp"
                  >
                    Chamar
                  </a>
                </span>
              ) : '—',
            ])}
          />
        )}
      </SectionCard>
    </div>
  );
};

// ─── Financeiro (taxas + cupons) ─────────────────────────────────────────────

export const FinanceSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const fin = useAnalyticsReport<FinanceReport>('finance', range, enabled);
  const coupons = useAnalyticsReport<CouponsReport>('coupons', range, enabled);
  const s = fin.data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Recebido × taxas" subtitle="Pagamentos aprovados no gateway (MercadoPago)" loading={fin.isLoading}>
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <StatCard label="Bruto" value={formatBRL(s?.gross ?? 0)} tone="brand" />
          <StatCard label="Taxas de gateway" value={formatBRL(s?.fees ?? 0)} tone="warning" />
          <StatCard label="Líquido" value={formatBRL(s?.net ?? 0)} />
          <StatCard label="Reembolsado" value={formatBRL(s?.refunded ?? 0)} />
        </div>
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-fg-muted-token mb-3">Por método</h3>
            <RankBarList
              items={(fin.data?.by_method ?? []).map((r) => ({ label: paymentLabel(r.payment_method), value: Number(r.net) }))}
              valueFormat={formatBRL}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg-muted-token mb-3">Por gateway</h3>
            <RankBarList
              items={(fin.data?.by_gateway ?? []).map((r) => ({ label: paymentLabel(r.gateway), value: Number(r.net) }))}
              valueFormat={formatBRL}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cupons"
        subtitle={coupons.data ? `${coupons.data.summary.coupon_usage_pct}% dos pedidos usaram cupom · ${formatBRL(coupons.data.summary.total_discount)} em descontos` : undefined}
        loading={coupons.isLoading}
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
          <MiniTable
            headers={[
              { label: 'Código' }, { label: 'Usos', align: 'right' },
              { label: 'Desconto dado', align: 'right' }, { label: 'Receita gerada', align: 'right' }, { label: 'Ticket', align: 'right' },
            ]}
            rows={(coupons.data?.coupons ?? []).map((c) => [
              c.code, c.orders, formatBRL(c.discount_total), formatBRL(c.revenue), formatBRL(c.avg_ticket),
            ])}
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
      <SectionCard title="Funil do bot" subtitle="Sessões de conversa → pedido no período" loading={bot.isLoading}>
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
          <RankBarList
            items={(bot.data?.funnel ?? []).map((f) => ({
              label: FUNNEL_LABELS[f.status] || f.status,
              value: f.count,
              tone: f.status === 'cart_abandoned' || f.status === 'expired' ? 'danger' : 'brand',
            }))}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Avaliações"
        subtitle={rsum?.count ? `Nota média ${rsum.avg_rating?.toFixed(1)} ★ em ${rsum.count} avaliações` : undefined}
        loading={reviews.isLoading}
      >
        {(rsum?.count ?? 0) === 0 ? (
          <EmptyNote text="Nenhuma avaliação no período." />
        ) : (
          <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
            <RankBarList
              items={(reviews.data?.distribution ?? []).map((d) => ({
                label: `${d.rating} ★`,
                value: d.count,
                tone: d.rating <= 2 ? 'danger' : 'brand',
              }))}
              hideZero={false}
            />
            <div className="flex flex-col gap-3">
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
