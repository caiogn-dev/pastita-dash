/**
 * SubscriptionManagementPage — gestão de assinatura da loja (rota /assinatura).
 *
 * Exibe o status atual da assinatura, permite trocar de plano (inicia checkout
 * MercadoPago) e cancelar a assinatura com confirmação.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { useConfirm } from '../../hooks/useConfirm';
import {
  getSubscription,
  subscribe,
  cancelSubscription,
  changePlan,
  getPlans,
  getCurrentInvoice,
  listInvoices,
  type SubscriptionStatus,
  type Plan,
  type Invoice,
  ADICIONAL_ETIQUETA,
} from '../../services/billing';
import { useAdicional } from '../../hooks/useAdicional';
import CartaoDeAdicional from '../../components/billing/CartaoDeAdicional';
import PixInvoicePanel from '../../components/billing/PixInvoicePanel';
import CartaoDePlano from '../../components/billing/CartaoDePlano';
import { nomeDoPlano } from './nomeDoPlano';
import { formatarReais, quantoOMarketplaceLevaria, type Ciclo } from './ofertaDoPlano';
import { PageShell } from '../../components/ui';

const STATUS_LABEL: Record<string, string> = {
  none:      'Sem assinatura',
  trialing:  'Em trial',
  active:    'Ativa',
  past_due:  'Pagamento atrasado',
  suspended: 'Suspensa',
  canceled:  'Cancelada',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending:    'Aguardando pagamento',
  processing: 'Processando',
  completed:  'Paga',
  paid:       'Paga',
  failed:     'Falhou',
  canceled:   'Cancelada',
  cancelled:  'Cancelada',
  refunded:   'Estornada',
};

const invoiceStatusLabel = (status?: string | null): string =>
  INVOICE_STATUS_LABEL[(status || '').toLowerCase()] ?? (status || '—');

const INVOICE_POLL_MS = 15000;

/** Uma fatura é considerada quitada quando tem `paid_at` ou status completed/paid. */
function isInvoicePaid(invoice: Invoice): boolean {
  if (invoice.paid_at) return true;
  const status = (invoice.status || '').toLowerCase();
  return status === 'completed' || status === 'paid';
}

const OPEN_INVOICE_STATUSES = new Set(['pending', 'processing', '']);

/**
 * Uma fatura só deve manter o polling ativo quando ainda está genuinamente
 * aberta. Não paga NÃO significa pendente: `cancelled`/`failed`/`refunded`/
 * qualquer status desconhecido são terminais e devem parar o polling.
 */
function isInvoicePending(invoice: Invoice | null): boolean {
  if (!invoice) return false;
  if (isInvoicePaid(invoice)) return false;
  const status = (invoice.status || '').toLowerCase();
  return OPEN_INVOICE_STATUSES.has(status);
}

export default function SubscriptionManagementPage() {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;
  const [ConfirmDialog, confirmAction] = useConfirm();

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // O seletor saiu da tela em 21/09 porque prometia "2 meses grátis" e
  // entregava assinatura mensal: o endpoint `subscribe/` ignorava o ciclo.
  // Voltou em 22/09, junto com o backend que o honra — anual grava
  // `billing_cycle` e emite fatura PIX do ano em vez de preapproval.
  //
  // Começa em 'annual' de propósito: é a oferta que inclui a implantação, e a
  // opção que aparece primeiro é a que vira padrão na cabeça de quem lê.
  const [ciclo, setCiclo] = useState<Ciclo>('annual');

  // O Grátis existe, mas não na vitrine — ver o comentário da grade.
  const planosPagos = plans.filter((p) => p.monthly_price > 0);
  const planoGratis = plans.find((p) => p.monthly_price === 0);

  const etiqueta = useAdicional(ADICIONAL_ETIQUETA);

  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!slug) {
      // Sem loja selecionada: não fica preso no "Carregando…" pra sempre.
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getSubscription(slug), getPlans()])
      .then(([s, p]) => {
        setSub(s);
        setPlans(p);
      })
      .catch(() => setError('Não foi possível carregar a assinatura.'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    mountedRef.current = true;
    listInvoices(slug)
      .then((invoices) => {
        if (mountedRef.current) setInvoiceHistory(invoices);
      })
      .catch(() => {
        /* histórico é auxiliar: falha silenciosa não bloqueia a página */
      });
    return () => {
      mountedRef.current = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchInvoice = async () => {
      try {
        const invoice = await getCurrentInvoice(slug);
        if (cancelled) return;
        setCurrentInvoice(invoice);
        if (!isInvoicePending(invoice) && intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        /* fatura atual é auxiliar: falha silenciosa não bloqueia a página */
      }
    };

    void fetchInvoice();
    intervalId = setInterval(() => {
      void fetchInvoice();
    }, INVOICE_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [slug]);

  async function handleCancel() {
    if (!slug) return;
    const confirmed = await confirmAction({
      title: 'Cancelar assinatura',
      message:
        'Sua loja continua ativa até o fim do período já pago e depois é rebaixada ao plano gratuito. Deseja cancelar?',
      confirmText: 'Cancelar assinatura',
      cancelText: 'Manter assinatura',
      variant: 'danger',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const r = await cancelSubscription(slug);
      setSub((prev) => prev ? { ...prev, status: r.status as SubscriptionStatus['status'] } : prev);
    } catch {
      setError('Falha ao cancelar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelarAdicional() {
    const confirmed = await confirmAction({
      title: 'Cancelar Etiqueta ANVISA',
      message:
        'Suas receitas continuam guardadas, mas a tela de ingredientes e as etiquetas nutricionais ficam bloqueadas. Se contratar de novo, a implantação é cobrada outra vez.',
      confirmText: 'Cancelar adicional',
      cancelText: 'Manter adicional',
      variant: 'danger',
    });
    if (confirmed) await etiqueta.cancelar();
  }

  async function handleChange(plan: Plan) {
    if (!slug) return;
    setBusy(true);
    try {
      if (ciclo === 'annual') {
        // Anual não tem init_point: é fatura PIX única. Redirecionar aqui
        // mandaria o dono para `undefined`.
        await subscribe(slug, plan.key, 'annual');
        const fatura = await getCurrentInvoice(slug);
        setCurrentInvoice(fatura);
        setSub(await getSubscription(slug));
        setBusy(false);
        return;
      }
      const r = await changePlan(slug, plan.key);
      window.location.href = r.init_point;
    } catch {
      setError('Falha ao trocar de plano.');
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-fg-muted-token">Carregando assinatura…</div>;
  }

  if (!slug) {
    return <div className="p-6 text-fg-muted-token">Nenhuma loja selecionada.</div>;
  }

  if (error) {
    return <div className="p-6 text-danger-token">{error}</div>;
  }

  return (
    <PageShell
      className="mx-auto max-w-4xl"
      titulo="Assinatura"
    >
      {/* O estado da assinatura em uma frase — é a primeira coisa que se procura aqui. */}
      <p className="text-sm text-fg-muted-token">
          Status:{' '}
          <strong className="text-fg-token">
            {STATUS_LABEL[sub?.status ?? 'none']}
          </strong>
          {sub?.plan && (
            <>
              {' '}— plano <strong className="text-fg-token">{nomeDoPlano(sub.plan, plans)}</strong>
            </>
          )}
          {sub?.current_period_end && (
            <>
              {' '}— próxima cobrança{' '}
              <strong className="text-fg-token">
                {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
              </strong>
            </>
          )}
      </p>

      {sub?.status === 'suspended' && (
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 text-danger-token text-sm">
          Sua loja está suspensa por falta de pagamento. Reative assinando um plano abaixo.
        </div>
      )}

      {sub?.status === 'past_due' && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 text-warning-token text-sm">
          Pagamento atrasado. Regularize sua assinatura para evitar a suspensão da loja.
        </div>
      )}

      {currentInvoice && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-token">Fatura atual</h2>
          {isInvoicePaid(currentInvoice) ? (
            <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] p-4 text-success-token text-sm">
              Pagamento em dia
              {currentInvoice.paid_at && (
                <>
                  {' '}— pago em{' '}
                  {new Date(currentInvoice.paid_at).toLocaleDateString('pt-BR')}
                </>
              )}
              .
            </div>
          ) : (
            <PixInvoicePanel
              pixCode={currentInvoice.pix_code}
              pixQrCode={currentInvoice.pix_qr_code}
              ticketUrl={currentInvoice.ticket_url}
              amount={currentInvoice.amount}
              status={currentInvoice.status}
              expiresAt={currentInvoice.expires_at}
            />
          )}
        </section>
      )}

      <section>
        {/* A âncora vem ANTES do preço, de propósito. R$ 249 sozinho é um
            custo; R$ 249 ao lado dos R$ 2.385 que o marketplace levaria da
            mesma loja é uma escolha. */}
        <div className="superficie mb-5 rounded-xl border border-border-token p-4 sm:p-5">
          <p className="text-sm text-fg-token">
            Uma loja que fatura <strong>{formatarReais(9000)}</strong> por mês entrega{' '}
            <strong>{formatarReais(quantoOMarketplaceLevaria(9000))}</strong> de comissão
            num marketplace de entrega.
          </p>
          <p className="mt-1 text-sm text-fg-muted-token">
            Aqui a comissão é <strong>0%</strong>: você paga o plano e fica com o resto.
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted-token">
            Tudo incluso, 0% de comissão, com bot + IA.
          </p>
          <div
            role="radiogroup"
            aria-label="Forma de pagamento"
            className="controle inline-flex rounded-lg p-0.5"
          >
            {([
              ['annual', 'Anual'],
              ['monthly', 'Mensal'],
            ] as Array<[Ciclo, string]>).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={ciclo === valor}
                onClick={() => setCiclo(valor)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  ciclo === valor ? 'bg-brand text-on-brand' : 'text-fg-muted-token'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {/* TRÊS colunas para TRÊS planos pagos. O Grátis saiu da vitrine e
            virou a linha discreta lá embaixo, por dois motivos:
            - de layout: com ele eram 4 cards, e 4 colunas nesta largura
              espremiam tudo — "Produtos no cardápio" quebrava em duas linhas
              em todos os cartões;
            - de venda: o Grátis não se vende. Dar a ele um quarto do espaço
              da vitrine é usar o lugar nobre para a opção que não fatura. */}
        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {planosPagos.map((p) => (
            <CartaoDePlano
              key={p.key}
              plano={p}
              planoAtual={sub?.plan}
              temAssinatura={!!sub && sub.status !== 'none'}
              ocupado={busy}
              ciclo={ciclo}
              recomendado={p.key === 'pro' && sub?.plan !== 'pro'}
              onEscolher={(plano) => void handleChange(plano)}
            />
          ))}
        </div>

        {planoGratis && sub?.plan !== 'free' && (
          <p className="mt-4 text-sm text-fg-muted-token">
            Prefere começar sem pagar? O plano{' '}
            <strong className="text-fg-token">Grátis</strong> aceita até{' '}
            {planoGratis.limits?.max_products ?? 20} produtos e não tem bot de
            WhatsApp.{' '}
            <button
              type="button"
              onClick={() => void handleChange(planoGratis)}
              className="font-medium text-brand-ink underline underline-offset-2"
            >
              Começar no Grátis
            </button>
          </p>
        )}
      </section>

      {etiqueta.adicional && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-fg-token">Adicionais</h2>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <CartaoDeAdicional
              adicional={etiqueta.adicional}
              estado={etiqueta.estado}
              ocupado={etiqueta.ocupado}
              erro={etiqueta.erro}
              onContratar={() => void etiqueta.contratar()}
              onCancelar={() => void handleCancelarAdicional()}
            />
          </div>
        </section>
      )}

      {invoiceHistory.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-token">Histórico de faturas</h2>
          <ul className="divide-y divide-border-token rounded-lg border border-border-token">
            {invoiceHistory.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span className="text-fg-token">{inv.period_key ?? '—'}</span>
                <span className="text-fg-muted-token">R$ {inv.amount.toFixed(2)}</span>
                <span className="text-fg-muted-token">{invoiceStatusLabel(inv.status)}</span>
                {inv.paid_at && (
                  <span className="text-xs text-fg-muted-token">
                    pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sub && sub.status !== 'none' && sub.status !== 'canceled' && (
        <div className="border-t border-border-token pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCancel()}
            className="rounded-lg border border-[var(--danger)]/40 px-3 py-1.5 text-sm font-medium text-danger-token transition-colors hover:bg-[var(--danger-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-token disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar assinatura
          </button>
        </div>
      )}
      {ConfirmDialog}
    </PageShell>
  );
}
