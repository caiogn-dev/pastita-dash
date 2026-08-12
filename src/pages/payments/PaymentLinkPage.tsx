/**
 * PaymentLinkPage — Link de pagamento AVULSO
 *
 * Gera um LINK DE PAGAMENTO (Checkout Pro / preference do Mercado Pago) de valor
 * arbitrário SEM pedido vinculado (StorePayment.order=null). É uma página hospedada
 * onde o cliente escolhe cartão/PIX/boleto — não apenas um PIX copia-e-cola.
 *
 * A TELA GUARDAVA O LINK SÓ NO ESTADO DO REACT (12/ago): um F5 e o lojista
 * perdia a cobrança, sem lugar nenhum para reencontrar o link nem para saber se
 * o cliente pagou. E havia 14 cobranças reais no banco que a tela nunca mostrou
 * — 5 delas pendentes, algumas pagas. O comentário antigo dizia que o backend
 * não sabia listá-las; sabia desde sempre (`Q(order__store) | Q(store)`).
 *
 * Agora o histórico é a memória: o link vive na lista, com status de pagamento,
 * e o formulário volta a ser só o formulário.
 */
import { copyToClipboard } from '../../utils/clipboard';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { paymentsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';

interface GeneratedLink {
  payment_url?: string;
  amount?: number | string;
}

/** Cobrança avulsa como a listagem devolve. */
interface Cobranca {
  id: string;
  amount: number | string;
  status: string;
  status_display?: string;
  payment_url?: string;
  description?: string;
  payer_name?: string;
  created_at: string;
  paid_at?: string | null;
}

const formatMoney = (value: number | undefined | null) =>
  `R$ ${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * O vocabulário da cobrança é o do dinheiro, não o do pedido: aqui "pago" é
 * `completed`. A pergunta que o lojista faz nesta tela é uma só — "pagou?" —,
 * então o rótulo responde isso, não o nome técnico do estado.
 */
const SITUACAO: Record<string, { rotulo: string; classe: string }> = {
  completed: { rotulo: 'Pago', classe: 'bg-[var(--success-soft)] text-[var(--success)]' },
  pending: { rotulo: 'Aguardando pagamento', classe: 'bg-[var(--warning-soft)] text-[var(--warning)]' },
  processing: { rotulo: 'Processando', classe: 'bg-[var(--info-soft)] text-[var(--info)]' },
  failed: { rotulo: 'Falhou', classe: 'bg-[var(--danger-soft)] text-[var(--danger)]' },
  cancelled: { rotulo: 'Cancelada', classe: 'bg-surface-2 text-fg-muted-token' },
  refunded: { rotulo: 'Estornada', classe: 'bg-surface-2 text-fg-muted-token' },
  partially_refunded: { rotulo: 'Estorno parcial', classe: 'bg-surface-2 text-fg-muted-token' },
};

export const PaymentLinkPage: React.FC = () => {
  const { storeId, storeName, isStoreSelected } = useStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerDocument, setPayerDocument] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLink | null>(null);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  const carregarCobrancas = useCallback(async () => {
    if (!storeId) return;
    setCarregandoLista(true);
    try {
      const r = await paymentsService.getPayments({
        store: storeId,
        sem_pedido: '1',
        page_size: '30',
      } as unknown as Record<string, string>);
      setCobrancas((r.results || []) as unknown as Cobranca[]);
    } catch {
      // Lista é complemento: falhar aqui não pode impedir de gerar cobrança.
      toast.error('Não foi possível carregar as cobranças anteriores.');
    } finally {
      setCarregandoLista(false);
    }
  }, [storeId]);

  useEffect(() => { carregarCobrancas(); }, [carregarCobrancas]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Selecione uma loja no menu superior.');
      return;
    }
    const parsed = Number(amount.trim().replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    setGenerating(true);
    try {
      const { payment } = await paymentsService.createPaymentLink({
        store: storeId,
        amount: parsed,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(payerName.trim() ? { payer_name: payerName.trim() } : {}),
        ...(payerEmail.trim() ? { payer_email: payerEmail.trim() } : {}),
        ...(payerDocument.trim() ? { payer_document: payerDocument.trim() } : {}),
      });
      const url = (payment.payment_url as string) || (payment.init_point as string) || undefined;
      if (!url) {
        toast.error('Não foi possível gerar o link. Verifique as credenciais de pagamento da loja.');
        return;
      }
      setGenerated({
        payment_url: url,
        amount: (payment.amount as number | string) ?? parsed,
      });
      toast.success('Link de pagamento gerado!');
      // O histórico é o que sobrevive ao F5 — a cobrança nova entra nele agora.
      carregarCobrancas();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) toast.success('Link copiado!');
    else toast.error('Não foi possível copiar. Copie manualmente.');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg-token">Link de pagamento</h1>
        <p className="mt-1 text-sm text-fg-muted-token">
          Gere um link para cobrar um valor avulso, sem precisar de um pedido. O cliente
          abre o link e paga por cartão, PIX ou boleto.
          {storeName ? ` Loja: ${storeName}.` : ''}
        </p>
      </header>

      {!isStoreSelected && (
        <div className="rounded-xl border border-border-token bg-surface px-4 py-3 text-sm text-fg-muted-token">
          Selecione uma loja no menu superior para gerar uma cobrança.
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-border-token bg-surface p-5">
        <div>
          <label htmlFor="pl-amount" className="block text-sm font-medium text-fg-token">
            Valor (R$)
          </label>
          <input
            id="pl-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            placeholder="0,00"
            required
          />
        </div>

        <div>
          <label htmlFor="pl-description" className="block text-sm font-medium text-fg-token">
            Descrição (opcional)
          </label>
          <input
            id="pl-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            placeholder="Ex: Sinal do evento"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pl-payer-name" className="block text-sm font-medium text-fg-token">
              Nome do pagador (opcional)
            </label>
            <input
              id="pl-payer-name"
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="pl-payer-email" className="block text-sm font-medium text-fg-token">
              E-mail do pagador (opcional)
            </label>
            <input
              id="pl-payer-email"
              type="email"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pl-payer-document" className="block text-sm font-medium text-fg-token">
            CPF do pagador (opcional)
          </label>
          <input
            id="pl-payer-document"
            type="text"
            inputMode="numeric"
            value={payerDocument}
            onChange={(e) => setPayerDocument(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            placeholder="000.000.000-00"
          />
          <p className="mt-1 text-xs text-fg-muted-token">
            Informar os dados reais do cliente aumenta a taxa de aprovação do cartão.
          </p>
        </div>

        <button
          type="submit"
          disabled={generating || !isStoreSelected}
          className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--brand-strong)] transition hover:opacity-90 disabled:opacity-60"
        >
          {generating ? 'Gerando...' : 'Gerar link de pagamento'}
        </button>
      </form>

      {generated && (
        <section className="mt-6 space-y-4 rounded-2xl border border-border-token bg-surface p-5">
          <h2 className="text-base font-semibold text-fg-token">
            Link gerado {generated.amount != null ? `— ${formatMoney(Number(generated.amount))}` : ''}
          </h2>

          {generated.payment_url && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-fg-muted-token">Link de pagamento</span>
              <div className="flex items-center gap-2">
                <code className="block flex-1 break-all rounded-xl border border-dashed border-border-token px-3 py-2 text-xs text-fg-token">
                  {generated.payment_url}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(generated.payment_url!)}
                  className="shrink-0 rounded-full border border-border-token px-3 py-2 text-xs font-medium text-fg-token hover:bg-surface-2"
                >
                  Copiar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={generated.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:opacity-90"
                >
                  Abrir link de pagamento
                </a>
                <span className="text-xs text-fg-muted-token">
                  Envie este link para o cliente — ele paga por cartão, PIX ou boleto.
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg-token">Cobranças geradas</h2>
            <p className="text-xs text-fg-muted-token">
              O link fica guardado aqui — não se perde ao atualizar a página. O
              pagamento aparece assim que o Mercado Pago avisa.
            </p>
          </div>
          <button
            type="button"
            onClick={carregarCobrancas}
            disabled={carregandoLista}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-token px-3 py-1.5 text-xs font-medium text-fg-token transition hover:bg-surface-2 disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${carregandoLista ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {cobrancas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-token px-4 py-8 text-center text-sm text-fg-muted-token">
            {carregandoLista ? 'Carregando…' : 'Nenhuma cobrança avulsa ainda.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {cobrancas.map((c) => {
              const situacao = SITUACAO[c.status] ?? {
                rotulo: c.status_display || c.status,
                classe: 'bg-surface-2 text-fg-muted-token',
              };
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border-token bg-surface px-4 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-semibold text-fg-token">
                      {formatMoney(Number(c.amount))}
                      {c.description ? (
                        <span className="ml-2 font-normal text-fg-muted-token">{c.description}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-fg-muted-token">
                      {formatDate(c.created_at)}
                      {c.payer_name ? ` · ${c.payer_name}` : ''}
                      {c.paid_at ? ` · pago em ${formatDate(c.paid_at)}` : ''}
                    </p>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${situacao.classe}`}>
                    {situacao.rotulo}
                  </span>

                  {c.payment_url && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(c.payment_url!)}
                        className="rounded-full border border-border-token px-3 py-1.5 text-xs font-medium text-fg-token transition hover:bg-surface-2"
                      >
                        Copiar link
                      </button>
                      <a
                        href={c.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border-token px-3 py-1.5 text-xs font-medium text-fg-token transition hover:bg-surface-2"
                      >
                        Abrir
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PaymentLinkPage;
