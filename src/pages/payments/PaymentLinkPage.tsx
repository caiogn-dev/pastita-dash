/**
 * PaymentLinkPage — Link de pagamento AVULSO
 *
 * Gera um LINK DE PAGAMENTO (Checkout Pro / preference do Mercado Pago) de valor
 * arbitrário SEM pedido vinculado (StorePayment.order=null). É uma página hospedada
 * onde o cliente escolhe cartão/PIX/boleto — não apenas um PIX copia-e-cola.
 *
 * A TELA GUARDAVA O LINK SÓ NO ESTADO DO REACT (12/ago): um F5 e o lojista
 * perdia a cobrança, sem lugar nenhum para reencontrar o link nem para saber se
 * o cliente pagou. Agora o histórico é a memória: o link vive na lista, com
 * status de pagamento, e o formulário volta a ser só o formulário.
 *
 * Molde "formulário + resumo" (14/10): à esquerda o que se preenche, à direita
 * (sticky) o resumo vivo e o botão com verbo + objeto. O link gerado ocupa o
 * lugar do resumo.
 */
import { copyToClipboard } from '../../utils/clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon, ClipboardDocumentIcon, PlusIcon, ShareIcon } from '@heroicons/react/24/outline';
import { paymentsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';
import { ordersService } from '../../services';
import type { Order } from '../../types';
import {
  Aviso,
  Button,
  Campo,
  CampoDeDinheiro,
  FormSummary,
  Input,
  PageShell,
  Secao,
  Select,
} from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

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
  refunded: { rotulo: 'Reembolsada', classe: 'bg-surface-2 text-fg-muted-token' },
  partially_refunded: { rotulo: 'Reembolso parcial', classe: 'bg-surface-2 text-fg-muted-token' },
};

export const PaymentLinkPage: React.FC = () => {
  const { storeId, isStoreSelected } = useStore();

  // number|null como o CampoDeDinheiro entrega; vazio é null, não zero.
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerDocument, setPayerDocument] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [pedidos, setPedidos] = useState<Order[]>([]);
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

  // Pedidos ainda não pagos desta loja — são os únicos que faz sentido cobrar.
  useEffect(() => {
    if (!storeId) return;
    ordersService
      .getOrders({ store_slug: storeId, payment_status: 'pending', page_size: 50 })
      .then((r) => setPedidos(r.results))
      .catch(() => setPedidos([]));
  }, [storeId]);

  /**
   * Escolher o pedido preenche o valor e a descrição.
   *
   * A cobrança tem que bater com o pedido: gerar link de R$ 50 para um pedido
   * de R$ 142 deixa a venda paga pela metade e ninguém percebe até fechar o
   * caixa.
   */
  const escolherPedido = (id: string) => {
    setPedidoId(id);
    const p = pedidos.find((o) => String(o.id) === id);
    if (!p) return;
    setAmount(p.total != null ? Number(p.total) : null);
    if (!description.trim()) setDescription(`Pedido ${p.order_number}`);
    if (!payerName.trim() && p.customer_name) setPayerName(p.customer_name);
  };

  /**
   * Pedido em aberto do MESMO valor, quando nenhum foi vinculado.
   *
   * Em 14/ago uma venda de R$ 62,89 foi lançada às 20:41 e às 20:54 saiu um
   * link AVULSO do mesmo valor. Pago, o link virou um segundo pedido: a mesma
   * venda contada duas vezes no faturamento. O sinal chega ANTES do envio:
   * depois de gerado, o link já está com o cliente.
   */
  const pedidoDoMesmoValor = useMemo(() => {
    if (pedidoId || !amount) return undefined;
    return pedidos.find((p) => Math.abs(Number(p.total ?? 0) - amount) < 0.005);
  }, [amount, pedidoId, pedidos]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Selecione uma loja no menu superior.');
      return;
    }
    const parsed = amount ?? 0;
    if (parsed <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    // Sem pedido anexado E sem descrição, o pedido que a cobrança gera nasce
    // sem itens — só com o valor (foi o que aconteceu na venda da Letícia).
    if (!pedidoId && !description.trim()) {
      toast.error('Anexe um pedido ou escreva uma descrição do que está cobrando — senão o pedido nasce sem itens, só com o valor.');
      return;
    }
    setGenerating(true);
    try {
      const { payment } = await paymentsService.createPaymentLink({
        store: storeId,
        amount: parsed,
        ...(pedidoId ? { order: pedidoId } : {}),
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

  // Folha nativa no celular; no computador cai no WhatsApp Web.
  const handleShare = async (url: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, text: 'Link de pagamento' });
      } catch {
        // Fechar a folha de compartilhar não é erro.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  };

  // Limpa os campos junto: reaproveitá-los gera cobrança em duplicidade sem querer.
  const novaCobranca = () => {
    setGenerated(null);
    setAmount(null);
    setDescription('');
    setPayerName('');
    setPayerEmail('');
    setPayerDocument('');
    setPedidoId('');
  };

  const pedidoEscolhido = pedidos.find((o) => String(o.id) === pedidoId);
  const textoDoBotao = amount ? `Gerar link de ${formatCurrency(amount)}` : 'Gerar link';

  return (
    <PageShell className="mx-auto w-full max-w-5xl" titulo="Link de pagamento">
      {!isStoreSelected && <Aviso tom="info" titulo="Selecione uma loja no menu superior" />}

      {/* Celular: uma coluna, resumo + botão no fim. Computador: duas, resumo
          sticky. O <form> envolve as duas para o botão da direita enviar. */}
      <form onSubmit={handleGenerate} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Pedido vem ANTES do valor porque é ele que preenche o valor. Sem
              vínculo, o pagamento entra como cobrança solta: o dinheiro aparece,
              a venda não (2 cobranças de R$ 249,01 ficaram fora do faturamento). */}
          <Secao titulo="Cobrança">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Select
                  rotulo="Pedido"
                  valor={pedidoId}
                  onMudar={escolherPedido}
                  vazio="Cobrança avulsa — sem pedido"
                  opcoes={pedidos.map((p) => ({
                    valor: String(p.id),
                    rotulo: `${p.order_number} — ${p.customer_name || 'Sem nome'} — R$ ${p.total}`,
                  }))}
                />
                {/* Aviso, não bloqueio: cobrar avulso um valor que coincide com um
                    pedido é raro, mas legítimo. Quem decide é quem está no balcão. */}
                {pedidoDoMesmoValor && (
                  <Aviso
                    tom="atencao"
                    titulo={`Pedido ${pedidoDoMesmoValor.order_number}${
                      pedidoDoMesmoValor.customer_name ? ` (${pedidoDoMesmoValor.customer_name})` : ''
                    } em aberto com o mesmo valor`}
                    acao={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => escolherPedido(String(pedidoDoMesmoValor.id))}
                      >
                        Vincular a esse pedido
                      </Button>
                    }
                  >
                    Cobrando avulso, a venda é contada duas vezes.
                  </Aviso>
                )}
              </div>

              <CampoDeDinheiro rotulo="Valor" valor={amount} onMudar={setAmount} obrigatorio />

              {/* Sem pedido, a descrição é o que dá itens ao pedido que a cobrança
                  gera — por isso só é obrigatória nesse caso. */}
              <Campo rotulo="Descrição" obrigatorio={!pedidoId}>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Sinal do evento"
                />
              </Campo>
            </div>
          </Secao>

          <Secao titulo="Pagador (opcional)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome">
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </Campo>
              <Campo rotulo="E-mail">
                <Input type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
              </Campo>
              {/* Sem máscara de propósito: o payload segue exatamente o que foi digitado. */}
              <Campo rotulo="CPF" className="sm:col-span-2">
                <Input
                  inputMode="numeric"
                  value={payerDocument}
                  onChange={(e) => setPayerDocument(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </Campo>
            </div>
          </Secao>
        </div>

        <aside aria-label="Resumo do link" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          {generated?.payment_url ? (
            <section
              aria-label="Link gerado"
              className="flex flex-col gap-3 rounded border border-border-token bg-surface p-4"
            >
              <h3 className="text-body font-semibold text-fg-token">
                Link gerado{generated.amount != null ? ` — ${formatCurrency(Number(generated.amount))}` : ''}
              </h3>
              <code className="block break-all rounded border border-dashed border-border-token px-3 py-2 text-xs text-fg-token">
                {generated.payment_url}
              </code>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}
                  onClick={() => handleCopy(generated.payment_url!)}
                >
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<ShareIcon className="h-4 w-4" />}
                  onClick={() => handleShare(generated.payment_url!)}
                >
                  Compartilhar
                </Button>
              </div>
              <a
                href={generated.payment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
              >
                Abrir link de pagamento
              </a>
              <Button variant="ghost" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={novaCobranca}>
                Nova cobrança
              </Button>
            </section>
          ) : (
            <>
              <FormSummary
                linhas={[
                  { rotulo: 'Valor', valor: amount ? formatCurrency(amount) : undefined },
                  { rotulo: 'Pedido', valor: pedidoEscolhido ? pedidoEscolhido.order_number : 'Avulsa' },
                  { rotulo: 'Pagador', valor: payerName.trim() || undefined },
                ]}
              />
              <Button type="submit" size="lg" fullWidth isLoading={generating} disabled={!isStoreSelected}>
                {generating ? 'Gerando…' : textoDoBotao}
              </Button>
            </>
          )}
        </aside>
      </form>

      <Secao
        titulo="Cobranças geradas"
        acoes={
          <Button
            variant="outline"
            size="sm"
            onClick={carregarCobrancas}
            disabled={carregandoLista}
            leftIcon={<ArrowPathIcon className={`h-4 w-4 ${carregandoLista ? 'animate-spin' : ''}`} />}
          >
            Atualizar
          </Button>
        }
      >
        {cobrancas.length === 0 ? (
          <p className="rounded border border-dashed border-border-token px-4 py-8 text-center text-sm text-fg-muted-token">
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
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-border-token px-4 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-semibold text-fg-token">
                      {formatCurrency(Number(c.amount))}
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
                      <Button variant="outline" size="sm" onClick={() => handleCopy(c.payment_url!)}>
                        Copiar link
                      </Button>
                      <a
                        href={c.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center rounded border border-border-token bg-surface px-3 text-sm font-medium text-fg-token transition-colors hover:bg-surface-2"
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
      </Secao>
    </PageShell>
  );
};

export default PaymentLinkPage;
