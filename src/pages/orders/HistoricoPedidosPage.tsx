/**
 * Histórico de pedidos — a tela que faltava entre o kanban e o detalhe.
 *
 * O painel tinha a operação do dia (kanban, arrasta e solta) e o detalhe de um
 * pedido. Não tinha onde responder as perguntas que aparecem DEPOIS do
 * serviço: "o que vendi semana passada", "cadê o pedido da moça que ligou
 * reclamando", "quanto entrou em PIX no mês".
 *
 * QUATRO DECISÕES QUE MOLDAM ESTA TELA:
 *
 * 1. Os totais vêm do MESMO recorte da lista (`/orders/resumo/` recebe os
 *    mesmos filtros). Um resumo calculado por outro caminho mostraria R$ 900
 *    acima de linhas que somam R$ 850 — e duas verdades na mesma tela derrubam
 *    a confiança nas duas.
 *
 * 2. Cancelado APARECE. É justamente o pedido que se vai investigar. Ele conta
 *    como pedido e não conta como dinheiro, e a tela diz isso por escrito.
 *
 * 3. Os filtros vivem na URL. Fechar o mês é trabalho de várias sessões: dá
 *    para mandar "olha esse recorte" por link e voltar onde parou.
 *
 * 4. Tabela densa, não cards. Aqui se VARRE em busca de um pedido; card por
 *    pedido cabe cinco na tela e transforma a busca em rolagem.
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, Badge, Button, PageShell, KpiGrid, EmptyState, linhaClicavel } from '../../components/ui';
import { PageLoading } from '../../components/common';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { useStore, useDebounce } from '../../hooks';
import { getOrders, getOrdersResumo, type StoreOrder } from '../../services/storesApi';
import {
  janelaDePeriodo,
  janelaInvertida,
  rotuloDaJanela,
  PERIODOS_DE_HISTORICO,
  type ChaveDePeriodo,
  type JanelaDeDatas,
} from './janelaDePeriodo';
import { baixarCsv, pedidosParaCsv } from './exportarPedidos';

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  ready: 'Pronto', out_for_delivery: 'Em entrega', delivered: 'Entregue',
  completed: 'Concluído', cancelled: 'Cancelado', failed: 'Falhou',
  refunded: 'Estornado',
};

const PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'PIX', cash: 'Dinheiro', credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito', card: 'Cartão', nao_informado: 'Não informado',
};

const CANAL_LABEL: Record<string, string> = {
  web: 'Site', whatsapp: 'WhatsApp', pdv: 'Balcão (PDV)',
  instagram: 'Instagram', nao_informado: 'Não informado',
};

const dinheiro = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Cancelado e estornado ficam legíveis mas apagados — existem, não pesam. */
const tonalidadeDaLinha = (status: string) =>
  status === 'cancelled' || status === 'refunded' || status === 'failed'
    ? 'opacity-60'
    : '';

export const HistoricoPedidosPage: React.FC = () => {
  const { storeId, storeSlug } = useStore();
  const storeQuery = storeSlug || storeId || undefined;
  const navigate = useNavigate();

  const [params, setParams] = useSearchParams();

  const periodo = (params.get('periodo') ?? '30d') as ChaveDePeriodo;
  const status = params.get('status') ?? '';
  const pagamento = params.get('pagamento') ?? '';
  const canal = params.get('canal') ?? '';
  const pagina = Math.max(1, parseInt(params.get('pagina') ?? '1', 10));

  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const buscaDebounced = useDebounce(busca.trim(), 400);

  // Datas do período personalizado ficam na URL como estão: recalcular a
  // janela apagaria o que o operador acabou de digitar.
  const janela: JanelaDeDatas = useMemo(() => {
    if (periodo === 'personalizado') {
      return {
        date_from: params.get('de') || undefined,
        date_to: params.get('ate') || undefined,
      };
    }
    return janelaDePeriodo(periodo) ?? {};
  }, [periodo, params]);

  const mudar = (chave: string, valor: string) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (valor) p.set(chave, valor); else p.delete(chave);
      // Mudar filtro sempre volta à primeira página: senão o operador filtra
      // "cancelados" e vê "nenhum pedido" porque continuava na página 4.
      if (chave !== 'pagina') p.delete('pagina');
      return p;
    }, { replace: true });
  };

  const filtros = {
    store: storeQuery,
    ...janela,
    ...(status ? { status } : {}),
    ...(pagamento ? { payment_method: pagamento } : {}),
    ...(canal ? { source: canal } : {}),
    ...(buscaDebounced ? { search: buscaDebounced } : {}),
  };

  const listaQuery = useQuery({
    queryKey: ['historico-pedidos', filtros, pagina],
    queryFn: () => getOrders({ ...filtros, page: pagina, page_size: PAGE_SIZE }),
    enabled: Boolean(storeQuery),
    placeholderData: keepPreviousData,
  });

  const resumoQuery = useQuery({
    queryKey: ['historico-resumo', filtros],
    queryFn: () => getOrdersResumo(filtros),
    enabled: Boolean(storeQuery),
    placeholderData: keepPreviousData,
  });

  const pedidos = listaQuery.data?.results ?? [];
  const total = listaQuery.data?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resumo = resumoQuery.data;
  const invertida = janelaInvertida(janela);

  // Anterior/próximo dentro do modal seguem a ORDEM DA LISTA filtrada. Sem
  // isso, conferir dez pedidos do mês custa dez idas e voltas à tabela.
  const idsDaPagina = useMemo(() => pedidos.map((p) => p.id), [pedidos]);

  const abrirPedido = (pedido: StoreOrder) => {
    // Mesma convenção do kanban: o detalhe é um modal em `?pedido=`, e o
    // histórico continua atrás — sair do detalhe não perde o recorte.
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('pedido', pedido.id);
      return p;
    });
  };

  if (!storeQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-fg-muted-token">Selecione uma loja para ver o histórico.</p>
        <Button onClick={() => navigate('/stores')}>Selecionar loja</Button>
      </div>
    );
  }

  if (listaQuery.isLoading) return <PageLoading />;

  const selectCls =
    'h-9 rounded-lg border border-border-token bg-surface px-3 text-sm text-fg-token outline-none focus:ring-2 focus:ring-brand';

  return (
    <PageShell
      trilha={[{ rotulo: 'Pedidos', href: `/stores/${storeQuery}/orders` }, { rotulo: 'Histórico' }]}
      titulo="Histórico de pedidos"
      descricao={`Todos os pedidos do período — ${rotuloDaJanela(janela)}.`}
      acoes={
        <Button
          variant="secondary"
          leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
          disabled={pedidos.length === 0}
          onClick={() => baixarCsv(pedidosParaCsv(pedidos), `pedidos-${janela.date_from ?? 'tudo'}.csv`)}
        >
          Baixar CSV
        </Button>
      }
      filtros={
        <div className="space-y-3">
          <div
            role="tablist"
            aria-label="Período"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PERIODOS_DE_HISTORICO.map((p) => {
              const ativo = p.value === periodo;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => mudar('periodo', p.value)}
                  className={`inline-flex min-h-9 items-center rounded-pill border px-3.5 text-sm font-semibold transition-colors ${
                    ativo
                      ? 'border-brand bg-brand-soft text-brand-ink'
                      : 'border-border-token bg-surface text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {periodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-fg-muted-token" htmlFor="hist-de">De</label>
              <input
                id="hist-de"
                type="date"
                className={selectCls}
                // `max` deixa o próprio navegador barrar parte do intervalo
                // invertido, antes de virar uma lista vazia inexplicável.
                max={params.get('ate') || undefined}
                value={params.get('de') ?? ''}
                onChange={(e) => mudar('de', e.target.value)}
              />
              <label className="text-sm text-fg-muted-token" htmlFor="hist-ate">até</label>
              <input
                id="hist-ate"
                type="date"
                className={selectCls}
                min={params.get('de') || undefined}
                value={params.get('ate') ?? ''}
                onChange={(e) => mudar('ate', e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted-token" />
              <input
                type="text"
                aria-label="Buscar pedido"
                placeholder="Número do pedido, nome ou telefone…"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); mudar('busca', e.target.value); }}
                className="h-9 w-80 max-sm:w-full rounded-lg border border-border-token bg-surface pl-9 pr-3 text-sm text-fg-token placeholder-fg-muted-token outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <select aria-label="Status" className={selectCls} value={status} onChange={(e) => mudar('status', e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            <select aria-label="Forma de pagamento" className={selectCls} value={pagamento} onChange={(e) => mudar('pagamento', e.target.value)}>
              <option value="">Qualquer pagamento</option>
              {['pix', 'cash', 'credit_card', 'debit_card'].map((v) => (
                <option key={v} value={v}>{PAGAMENTO_LABEL[v]}</option>
              ))}
            </select>

            <select aria-label="Canal" className={selectCls} value={canal} onChange={(e) => mudar('canal', e.target.value)}>
              <option value="">Todos os canais</option>
              {['web', 'whatsapp', 'pdv'].map((v) => (
                <option key={v} value={v}>{CANAL_LABEL[v]}</option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      {resumo && (
        <KpiGrid
          className="mb-5"
          itens={[
            {
              label: 'Pedidos',
              value: resumo.pedidos,
              definicao: 'tudo que entrou no período, inclusive cancelado e não pago',
            },
            {
              label: 'Faturamento',
              value: `R$ ${dinheiro(resumo.faturamento)}`,
              tone: 'brand',
              definicao: resumo.definicoes?.faturamento ?? 'soma dos pedidos pagos',
            },
            {
              label: 'Ticket médio',
              // "R$ 0,00" leria como venda de graça; sem venda, não há ticket.
              value: resumo.ticket_medio === null ? '—' : `R$ ${dinheiro(resumo.ticket_medio)}`,
              definicao: resumo.definicoes?.ticket_medio ?? 'faturamento ÷ pedidos que faturaram',
            },
            {
              label: 'Cancelados',
              value: resumo.cancelados,
              definicao: 'aparecem na lista e não entram no faturamento',
            },
          ]}
        />
      )}

      {resumo && resumo.por_pagamento.length > 0 && (
        <Card className="mb-5 p-4">
          <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-3">
            Como entrou o dinheiro
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {resumo.por_pagamento.map((q) => (
              <div key={q.chave}>
                <p className="text-sm text-fg-muted-token">
                  {PAGAMENTO_LABEL[q.chave] ?? q.chave}
                </p>
                <p className="text-lg font-bold text-fg-token leading-tight">
                  R$ {dinheiro(q.total)}
                </p>
                <p className="text-xs text-fg-muted-token">
                  {q.pedidos} {q.pedidos === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {pedidos.length === 0 ? (
          invertida ? (
            /* "Nenhum pedido neste recorte" seria verdade e inútil: manda o
               operador procurar um pedido que não sumiu, em vez de olhar para
               as duas datas. */
            <EmptyState
              icone={<ReceiptPercentIcon className="h-8 w-8 text-[var(--warning)]" />}
              titulo="As datas estão invertidas"
              descricao={`A data inicial (${rotuloDaJanela({ date_from: janela.date_from })}) vem depois da final. Nenhum período existe entre elas.`}
              acao={
                <Button
                  onClick={() => {
                    setParams((prev) => {
                      const p = new URLSearchParams(prev);
                      const de = p.get('de');
                      p.set('de', p.get('ate') ?? '');
                      p.set('ate', de ?? '');
                      return p;
                    }, { replace: true });
                  }}
                >
                  Trocar as datas de lugar
                </Button>
              }
            />
          ) : (
          <EmptyState
            icone={<ReceiptPercentIcon className="h-8 w-8 text-fg-muted-token" />}
            titulo="Nenhum pedido neste recorte"
            descricao={`Não há pedidos entre ${rotuloDaJanela(janela)} com os filtros escolhidos.`}
            acao={
              <Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Limpar filtros
              </Button>
            }
          />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-token bg-surface-2">
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest">Pedido</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest">Cliente</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden lg:table-cell">Itens</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden xl:table-cell">Canal</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest hidden md:table-cell">Pagamento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-fg-muted-token uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-fg-muted-token uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-token">
                  {pedidos.map((p) => {
                    const qtdItens = (p.items?.length ?? 0) + (p.combo_items?.length ?? 0);
                    const cancelado = p.status === 'cancelled';
                    return (
                      <tr
                        key={p.id}
                        {...linhaClicavel(() => abrirPedido(p), `Abrir pedido ${p.order_number}`)}
                        className={`${linhaClicavel(() => {}, '').className} ${tonalidadeDaLinha(p.status)}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-fg-muted-token">
                          {format(new Date(p.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-fg-token">
                          #{p.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-fg-token">{p.customer_name || '—'}</p>
                          <p className="text-xs text-fg-muted-token">{p.customer_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell text-fg-muted-token">
                          {qtdItens}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-fg-muted-token">
                          {CANAL_LABEL[p.source ?? ''] ?? p.source ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-fg-muted-token">
                          {PAGAMENTO_LABEL[p.payment_method] ?? p.payment_method ?? '—'}
                          {p.payment_status === 'paid' ? '' : ' (não pago)'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={cancelado ? 'danger' : p.status === 'delivered' ? 'success' : 'neutral'}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-fg-token whitespace-nowrap">
                          {/* Riscado quando cancelado: o valor existiu e não
                              virou dinheiro — esconder faria a linha parecer
                              uma venda a menos, e mostrar normal infla a soma
                              que o olho faz. */}
                          <span className={cancelado ? 'line-through text-fg-muted-token' : ''}>
                            R$ {dinheiro(p.total)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border-token">
              <span className="text-xs text-fg-muted-token">
                {Math.min((pagina - 1) * PAGE_SIZE + 1, total)}–{Math.min(pagina * PAGE_SIZE, total)} de {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Página anterior"
                  onClick={() => mudar('pagina', String(pagina - 1))}
                  disabled={pagina <= 1}
                  className="p-1.5 rounded-lg text-fg-muted-token hover:text-fg-token hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-xs text-fg-muted-token">
                  {pagina} de {totalPaginas}
                </span>
                <button
                  type="button"
                  aria-label="Próxima página"
                  onClick={() => mudar('pagina', String(pagina + 1))}
                  disabled={pagina >= totalPaginas}
                  className="p-1.5 rounded-lg text-fg-muted-token hover:text-fg-token hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* O detalhe é o MESMO modal do kanban: uma tela de pedido só, e sair
          dela devolve o operador ao recorte que ele montou. */}
      <OrderDetailModal
        siblings={idsDaPagina}
        onOrderChanged={() => { listaQuery.refetch(); resumoQuery.refetch(); }}
      />
    </PageShell>
  );
};

export default HistoricoPedidosPage;
