import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CubeIcon,
  BoltIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  Button,
  EmptyState,
  FalhaAoCarregar,
  InsightList,
  KpiGrid,
  PageShell,
  Progresso,
  Secao,
  SeloDeEstado,
  Skeleton,
  Tabela,
  Verificacao,
  estadoDePedido,
  estadoDeSaude,
} from '../../components/ui';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import OnboardingWizard from '../../components/onboarding/wizard/OnboardingWizard';
import { buildWizardSteps } from '../../components/onboarding/wizard/buildWizardSteps';
import { getChecklist, markWizardSeen } from '../../services/onboarding';
import { useStore, useOrderDetailModal } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useOrderSound } from '../../hooks/useOrderSound';
import { getOrders, getOrderStats, updateOrderStatus, StoreOrder } from '../../services/storesApi';
import { dashboardService } from '../../services';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { AiDailySummaryCard } from '../../components/dashboard/AiDailySummaryCard';
import ForecastPanel from '../../components/dashboard/ForecastPanel';
import { useAiDailySummary } from '../../hooks/queries/useAiDailySummary';
import type { Order } from '../../types';
import type { ProjectHealth } from '../../types/dashboard';
import { useAvaliacoesDaLoja } from '../../hooks/queries/useAvaliacoesDaLoja';
import { CarrinhosAbandonadosCard } from '../../components/dashboard/CarrinhosAbandonadosCard';
import { leituraDeAvaliacoes } from './leituraDeAvaliacoes';
import { formatCurrency } from '../../utils/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As etapas do pedido, na ordem em que ele anda. Uma cor só (a da marca): a
 * etapa já está escrita ao lado e a barra só mede quantos — cinco cores aqui
 * eram decoração, e competiam com o amarelo/vermelho que significa atenção.
 */
const PIPELINE = [
  { key: 'pending',          label: 'Pendentes' },
  { key: 'confirmed',        label: 'Confirmados' },
  { key: 'preparing',        label: 'Preparando' },
  { key: 'out_for_delivery', label: 'A caminho' },
  { key: 'delivered',        label: 'Entregues' },
];

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  pending:          { label: 'Confirmar',       next: 'confirmed' },
  confirmed:        { label: 'Iniciar preparo',  next: 'preparing' },
  preparing:        { label: 'Despachar',        next: 'out_for_delivery' },
  out_for_delivery: { label: 'Entregue',         next: 'delivered' },
};

/** Área do alerta da saúde do sistema → para onde ele leva. */
function destinoDoAlerta(area: string, storeRoute: string): string {
  if (area === 'orders' || area === 'payments') return `/stores/${storeRoute}/orders`;
  if (area === 'catalog') return `/stores/${storeRoute}/products`;
  if (area === 'messages') return '/whatsapp/inbox';
  return '/analytics';
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saudação por faixa do dia.
 *
 * Parece enfeite e não é: a home abre igual às 6h e às 22h, e o operador usa o
 * painel em pé, entre um pedido e outro. A saudação é o sinal barato de que a
 * tela CARREGOU e é a sua — junto com o nome da loja, resolve a pergunta "estou
 * na loja certa?" antes de qualquer número.
 */
function saudacaoDoDia(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { store, storeId, storeSlug } = useStore();
  const storeRoute = storeSlug || storeId || '';

  // Detalhe do pedido em modal (?pedido=<id>) — abre sem sair do dashboard.
  const { openOrder } = useOrderDetailModal();
  // Reflete no card da lista "pedidos recentes" o que mudar dentro do modal.
  const handleOrderChanged = useCallback((updated: Order) => {
    setRecentOrders((prev) =>
      prev.map((o) =>
        o.id === updated.id
          ? { ...o, status: updated.status, payment_status: updated.payment_status ?? o.payment_status }
          : o,
      ),
    );
  }, []);

  // Onboarding wizard: auto-abre 1× no 1º login de loja incompleta (derivado
  // do checklist + flag wizard_seen do backend; markWizardSeen garante 1 vez só).
  const [wizardOpen, setWizardOpen] = useState(false);
  useEffect(() => {
    if (!storeSlug) return;
    getChecklist(storeSlug).then((c) => {
      if (!c.all_done && !c.wizard_seen) {
        setWizardOpen(true);
        markWizardSeen(storeSlug).catch(() => {});
      }
    }).catch(() => {});
  }, [storeSlug]);

  const { checkAndNotify } = useOrderSound();

  const [ordersToday, setOrdersToday]           = useState(0);
  const [revenueToday, setRevenueToday]         = useState(0);
  // Comparativo com ontem. Número sozinho não informa: R$ 137 pode ser um dia
  // bom ou metade do normal, e quem olha o card não tem como saber.
  const [cmpHoje, setCmpHoje] = useState<{ variacao_pct: number | null; rotulo: string } | undefined>();
  const [pendingCount, setPendingCount]         = useState(0);
  const [conversationsOpen, setConversationsOpen] = useState(0);
  // Série curta dos últimos 14 dias, por KPI. Vem do overview.
  const [sparkline, setSparkline] = useState<{ revenue: number[]; orders: number[] }>({
    revenue: [],
    orders: [],
  });
  const [recentOrders, setRecentOrders]         = useState<StoreOrder[]>([]);
  const [pipelineCounts, setPipelineCounts]     = useState<Record<string, number>>({});
  const [projectHealth, setProjectHealth]       = useState<ProjectHealth | null>(null);
  // Três gates independentes: os KPIs (Pedidos/Receita/Aguardando + pipeline)
  // saem SÓ do /stats e não devem esperar o overview (18 queries) nem a lista.
  // Cada bloco pinta assim que a SUA fonte volta — antes o Promise.allSettled
  // prendia tudo até o request mais lento dos três.
  const [kpisLoading, setKpisLoading]           = useState(true);
  const [ordersLoading, setOrdersLoading]       = useState(true);
  const [overviewLoading, setOverviewLoading]   = useState(true);
  const [loadError, setLoadError]               = useState(false);
  const [healthLoading, setHealthLoading]       = useState(true);
  const [advancing, setAdvancing]               = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt]           = useState(new Date());

  // Mesmo hook (e mesma queryKey) do AiDailySummaryCard: o react-query dedupa,
  // então não há requisição extra. O forecast já vinha no payload e estava sendo
  // descartado — o card só renderizava o `summary` em texto.
  const { data: aiSummary, isLoading: aiSummaryLoading } = useAiDailySummary(storeSlug || storeId);

  // Avaliações dos últimos 30 dias. O endpoint já existia e alimentava só a
  // aba de relatório — que o dono raramente abre.
  const {
    data: avaliacoes,
    isLoading: avaliacoesLoading,
    isError: avaliacoesErro,
    refetch: recarregarAvaliacoes,
  } = useAvaliacoesDaLoja(storeSlug || storeId);
  const leitura = useMemo(() => leituraDeAvaliacoes(avaliacoes), [avaliacoes]);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setKpisLoading(true);
    setOrdersLoading(true);
    setOverviewLoading(true);
    setLoadError(false);

    // O card "Saúde do sistema" SÓ é renderizado p/ is_staff (admin). Pra dono de
    // loja comum ele nunca aparece — então NÃO buscar é o certo: era o request mais
    // caro do dashboard (~24 queries, ~4s no cache frio) sendo pago por todo mundo
    // p/ um widget que ninguém via. Staff: fica fora do caminho crítico (não trava KPIs).
    if (user?.is_staff) {
      setHealthLoading(true);
      dashboardService.getProjectHealth({ store: storeId })
        .then((h) => setProjectHealth(h))
        .catch(() => {})
        .finally(() => setHealthLoading(false));
    } else {
      setHealthLoading(false);
    }

    // As 3 chamadas disparam juntas (paralelo), mas cada uma pinta o SEU bloco
    // ao voltar — sem barreira única no fim. Só os 10 recentes p/ a tabela; o
    // /stats agrega por status p/ qualquer volume; o overview traz sparkline +
    // conversas (18 queries, o mais lento — por isso não pode segurar os KPIs).
    const ordersP   = getOrders({ store: storeId, page_size: 10, ordering: '-created_at' });
    const statsP    = getOrderStats(storeId);
    const overviewP = dashboardService.getOverview({ store: storeId });

    // ── KPIs + pipeline: pintam assim que o /stats resolve.
    statsP
      .then((stats) => {
        if (!stats) return;
        setOrdersToday(Number(stats.total_orders || 0));
        setRevenueToday(Number(stats.today_revenue || 0));
        setCmpHoje(stats.comparativo?.today);
        const byStatus = stats.by_status || {};
        setPipelineCounts(byStatus);
        const pend = Number(byStatus.pending || 0);
        setPendingCount(pend);
        checkAndNotify(pend);
      })
      .catch(() => {})
      .finally(() => setKpisLoading(false));

    // ── Tabela de pedidos recentes: skeleton próprio.
    ordersP
      .then((resp) => setRecentOrders(resp.results.slice(0, 10)))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));

    // ── Overview: conversas + sparkline (o card "Esperando resposta").
    overviewP
      .then((overview) => {
        const cv = overview?.conversations;
        // waiting_reply e não by_status.open: o status nasce 'open' e nada
        // nunca fecha, então `open` é o total histórico. Fallback p/ backend antigo.
        if (cv) setConversationsOpen(Number(cv.waiting_reply ?? cv.by_status?.open ?? cv.active ?? 0));
        const sk = (overview as { sparkline?: { revenue?: number[]; orders?: number[] } })?.sparkline;
        if (sk) setSparkline({ revenue: sk.revenue ?? [], orders: sk.orders ?? [] });
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));

    // ── Fallback dos KPIs: o overview só assume Pedidos/Receita/Aguardando
    // quando o /stats FALHA. Com stats OK, ele é a fonte (resolve primeiro,
    // pinta antes) e o overview não sobrescreve. Ambos saem do mesmo banco.
    Promise.allSettled([statsP, overviewP]).then(([s, o]) => {
      if (s.status === 'rejected' && o.status === 'fulfilled') {
        const ov = o.value?.orders;
        if (ov) {
          const pend = Number(ov.by_status?.pending ?? 0);
          setPendingCount(pend);
          setRevenueToday(Number(ov.revenue_today ?? 0));
          setOrdersToday(Number(ov.today ?? 0));
          checkAndNotify(pend);
        }
      }
    });

    // ── Falha TOTAL (os 3 caíram): allSettled nunca rejeita, então uma queda
    // geral passaria como "loja vazia" (KPIs 0 + "Nenhum pedido ainda"). Detecta
    // e sinaliza p/ o dono poder tentar de novo.
    Promise.allSettled([ordersP, statsP, overviewP]).then((rs) => {
      if (rs.every((r) => r.status === 'rejected')) {
        setLoadError(true);
        toast.error('Erro ao carregar dados');
      }
      setRefreshedAt(new Date());
    });
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdvance = useCallback(async (orderId: string, nextStatus: string) => {
    setAdvancing(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success('Status atualizado ✓');
      await loadData();
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setAdvancing(null);
    }
  }, [loadData]);

  if (!storeId) {
    return (
      <PageShell titulo="Início">
        <EmptyState
          icone={<BuildingStorefrontIcon className="h-8 w-8" />}
          titulo="Nenhuma loja selecionada"
          descricao="Selecione uma loja para ver o dashboard."
          acao={<Button onClick={() => navigate('/stores')}>Selecionar loja</Button>}
        />
      </PageShell>
    );
  }

  const maxPipeline = Math.max(...PIPELINE.map((s) => pipelineCounts[s.key] || 0), 1);
  // Preparando + a caminho: o que já saiu da fila de confirmação mas ainda não
  // chegou. É a carga da cozinha e da entrega agora.
  const emPreparo = (pipelineCounts.preparing || 0) + (pipelineCounts.out_for_delivery || 0);
  const saude = estadoDeSaude(projectHealth?.status);
  const perdidas = projectHealth?.automation.pipeline.dropped ?? 0;
  const comentarios = (avaliacoes?.recent ?? []).filter((r) => r.comment?.trim()).slice(0, 2);

  return (
    <PageShell
      // A home não tinha título visível — só um h1 `sr-only`. Quem abre o
      // painel de manhã não sabe de cara em qual loja está, e com multi-loja
      // isso é um erro caro. A saudação nomeia a loja.
      titulo={`${saudacaoDoDia()}${store?.name ?`, ${store.name}` : ''}!`}
      // "Atualizado às" morava num rodapé que ninguém rolava até ver. No
      // cabeçalho, a hora do dado e o botão de refazer ficam juntos.
      acoes={
        <>
          <span className="text-caption text-fg-muted-token">
            Atualizado às {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={loadData}
          >
            Atualizar agora
          </Button>
        </>
      }
    >
      {storeId && (
        <OnboardingWizard open={wizardOpen} steps={buildWizardSteps(storeId)} onClose={() => setWizardOpen(false)} />
      )}
      <OnboardingChecklist onContinue={storeId ? () => setWizardOpen(true) : undefined} />

      {/* Detalhe do pedido em modal (aberto via ?pedido=<id> ao clicar numa linha) */}
      <OrderDetailModal onOrderChanged={handleOrderChanged} />

      {/* ── Falha total no carregamento ── Sem isto, os 3 requests caídos
          passariam por "loja vazia": KPIs 0 e "Nenhum pedido ainda". */}
      {loadError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar os dados do dashboard"
          onTentarDeNovo={loadData}
        />
      )}

      {/* ── Acesso rápido ──
          As sete telas que o dono abre todo dia. Chegar em qualquer uma delas
          pelo menu custa achar a seção, abrir e clicar — e a home é justamente
          onde ele ainda não decidiu para onde vai. Aqui é um clique.
          Não é duplicata do menu: o menu é COMPLETO e organizado por taxonomia
          nossa; isto é CURADO por frequência de uso real. */}
      <nav aria-label="Acesso rápido" className="flex flex-wrap gap-2">
        {[
          { rotulo: 'Pedidos', href: `/stores/${storeRoute}/orders` },
          { rotulo: 'Cardápio', href: `/stores/${storeRoute}/products` },
          { rotulo: 'WhatsApp', href: '/inbox/whatsapp' },
          { rotulo: 'Clientes', href: `/stores/${storeRoute}/customers` },
          { rotulo: 'Cupons', href: `/stores/${storeRoute}/coupons` },
          { rotulo: 'Relatórios', href: '/analytics' },
          { rotulo: 'Link na Bio', href: `/stores/${storeRoute}/link-bio` },
        ].map((a) => (
          <Button
            key={a.href}
            size="sm"
            variant="outline"
            className="rounded-pill font-medium text-fg-muted-token hover:border-brand hover:text-fg-token"
            onClick={() => navigate(a.href)}
          >
            {a.rotulo}
          </Button>
        ))}
      </nav>

      {/* ── Números do dia ──
          Cada número diz o que ELE conta. "Receita hoje R$ 1.557" já foi
          contestado três vezes porque ninguém sabia se incluía frete, se
          contava o cancelado, ou se o dia era o do pedido ou o do pagamento —
          e das três, duas viraram auditoria de backend por engano. A definição
          fica impressa, não em tooltip: no celular tooltip não existe.

          Tom só onde o número pede ação (pedido parado, cliente sem
          resposta). Receita em dourado era cor por métrica, não informação. */}
      <KpiGrid
        itens={[
          {
            label: 'Pedidos hoje',
            icone: <ShoppingBagIcon />,
            serie: sparkline.orders,
            value: kpisLoading ? '—' : ordersToday,
            definicao:
              !kpisLoading && ordersToday === 0
                ? 'Nenhum ainda hoje'
                : 'Todos os pedidos criados hoje, inclusive cancelados.',
            onClick: () => navigate(`/stores/${storeRoute}/orders`),
          },
          {
            label: 'Receita hoje',
            icone: <BanknotesIcon />,
            serie: sparkline.revenue,
            value: kpisLoading ? '—' : formatCurrency(revenueToday),
            definicao: 'Pagos e não cancelados, pela data do pagamento. Sem pedido de teste.',
            comparativo:
              cmpHoje && !kpisLoading
                ? { variacaoPct: cmpHoje.variacao_pct, rotulo: cmpHoje.rotulo }
                : undefined,
          },
          {
            label: 'Aguardando',
            icone: <BellAlertIcon />,
            value: kpisLoading ? '—' : pendingCount,
            tone: pendingCount > 0 ? 'warning' : 'default',
            definicao:
              pendingCount > 0
                ? 'Pedidos parados esperando você confirmar.'
                : 'Nenhum pedido parado ✓',
            onClick: () => navigate(`/stores/${storeRoute}/orders?status=pending`),
          },
          {
            label: 'Esperando resposta',
            icone: <ChatBubbleLeftRightIcon />,
            value: overviewLoading ? '—' : conversationsOpen,
            tone: !overviewLoading && conversationsOpen > 0 ? 'warning' : 'default',
            definicao:
              conversationsOpen > 0
                ? 'Clientes que falaram por último e ainda não foram respondidos (48h).'
                : 'Ninguém esperando resposta ✓',
            onClick: () => navigate('/inbox/whatsapp'),
          },
        ]}
      />

      {/* ── Pedidos agora ── os recentes (2/3) e onde eles estão (1/3). */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Secao
          titulo="Pedidos agora"
          descricao="Os dez mais recentes. Clique na linha para abrir o pedido."
          className="min-w-0 xl:col-span-2"
          acoes={
            <>
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/stores/${storeRoute}/orders`)}
              >
                Ver todos
              </Button>
              <Button
                size="sm"
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => navigate(`/stores/${storeRoute}/orders?novo=1`)}
              >
                Novo pedido
              </Button>
            </>
          }
        >
          <Tabela<(typeof recentOrders)[number]>
            itens={recentOrders}
            chave={(o) => String(o.id)}
            rotuloDaLinha={(o) => `Abrir pedido ${o.order_number}`}
            onAbrir={(o) => openOrder(o.id)}
            carregando={ordersLoading}
            vazio={{
              titulo: 'Nenhum pedido ainda',
              descricao: 'Os pedidos do cardápio, do WhatsApp e do balcão aparecem aqui assim que chegam.',
              icone: <ShoppingCartIcon className="h-8 w-8" />,
            }}
            colunas={[
              {
                chave: 'pedido',
                cabecalho: 'Pedido',
                render: (o) => (
                  <>
                    <p className="font-mono text-sm font-semibold text-fg-token">
                      #{o.order_number}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted-token">
                      {new Date(o.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </>
                ),
              },
              {
                chave: 'cliente',
                cabecalho: 'Cliente',
                classe: 'max-md:hidden',
                render: (o) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg-token">
                      {o.customer_name || '—'}
                    </p>
                    {o.customer_phone && (
                      <p className="text-xs text-fg-muted-token">{o.customer_phone}</p>
                    )}
                  </div>
                ),
              },
              {
                chave: 'status',
                cabecalho: 'Status',
                render: (o) => {
                  // Nosso rótulo PRIMEIRO, `status_display` como reserva —
                  // a regra mora em `estadoDePedido`.
                  const estado = estadoDePedido(o.status, o.status_display);
                  return <SeloDeEstado tone={estado.tone}>{estado.rotulo}</SeloDeEstado>;
                },
              },
              {
                chave: 'total',
                cabecalho: 'Total',
                alinhamento: 'direita',
                render: (o) => (
                  <span className="text-sm font-semibold tabular-nums text-fg-token">{formatCurrency(o.total)}</span>
                ),
              },
              {
                chave: 'acao',
                cabecalho: 'Ação rápida',
                alinhamento: 'direita',
                render: (o) => {
                  const action = NEXT_ACTION[o.status];
                  if (!action) return null;
                  return (
                    <Button
                      size="xs"
                      // A linha abre o pedido; avançar o status daqui não pode
                      // arrastar o dono para o modal junto.
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdvance(o.id, action.next);
                      }}
                      isLoading={advancing === o.id}
                    >
                      {action.label}
                    </Button>
                  );
                },
              },
            ]}
          />
        </Secao>

        <Secao
          titulo="Onde estão seus pedidos"
          descricao="Quantos estão em cada etapa agora."
          acoes={
            <Button
              size="sm"
              variant="ghost"
              rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/stores/${storeRoute}/orders`)}
            >
              Gerenciar
            </Button>
          }
        >
          {kpisLoading ? (
            <Skeleton count={5} className="h-8" />
          ) : (
            <ul className="flex flex-col gap-1">
              {PIPELINE.map(({ key, label }) => {
                const count = pipelineCounts[key] || 0;
                const pct = Math.round((count / maxPipeline) * 100);
                return (
                  <li key={key}>
                    <Button
                      variant="ghost"
                      className="h-auto w-full flex-col items-stretch gap-1.5 px-2 py-2 font-normal"
                      onClick={() => navigate(`/stores/${storeRoute}/orders?status=${key}`)}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-medium text-fg-muted-token">{label}</span>
                        <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-fg-token' : 'text-fg-muted-token'}`}>
                          {count}
                        </span>
                      </span>
                      <Progresso pct={count > 0 ? Math.max(pct, 6) : 0} rotulo={`${label}: ${count}`} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>
      </div>

      {/* ── Precisa de você ──
          Era uma barra só, para uma coisa só: pedidos pendentes. Tudo o mais
          que trava o dia — conversa sem resposta, pedido parado na cozinha —
          o dono só descobria abrindo a tela certa por conta própria.

          Fila de trabalho: cada linha diz o QUE está parado, QUANTO, e leva
          direto ao recorte. Sem linha nenhuma, a seção some — é o sinal de que
          não há nada esperando, e vale mais que um "tudo certo" decorativo. */}
      {!kpisLoading && (
        <InsightList
          titulo="Precisa de você"
          tom="alerta"
          itens={[
            pendingCount > 0 && {
              direcao: 'alta' as const,
              titulo: `${pendingCount} pedido${pendingCount > 1 ? 's' : ''} aguardando confirmação`,
              valor: String(pendingCount),
              recomendacao: 'o cliente já pagou e está esperando',
              acao: {
                rotulo: 'Ver pendentes',
                onClick: () => navigate(`/stores/${storeRoute}/orders?status=pending`),
              },
            },
            emPreparo > 0 && {
              direcao: 'estavel' as const,
              titulo: `${emPreparo} pedido${emPreparo > 1 ? 's' : ''} em preparo`,
              valor: String(emPreparo),
              recomendacao: 'acompanhe na cozinha',
              acao: {
                rotulo: 'Abrir cozinha',
                onClick: () => navigate(`/stores/${storeRoute}/kds`),
              },
            },
            conversationsOpen > 0 && {
              direcao: 'alta' as const,
              titulo: `${conversationsOpen} cliente${conversationsOpen > 1 ? 's' : ''} esperando resposta`,
              valor: String(conversationsOpen),
              recomendacao: 'falaram por último e ninguém respondeu',
              acao: { rotulo: 'Abrir inbox', onClick: () => navigate('/inbox/whatsapp') },
            },
          ].filter(Boolean) as React.ComponentProps<typeof InsightList>['itens']}
        />
      )}

      {/* ── Resumo IA (ontem) ── */}
      <AiDailySummaryCard store={storeSlug || storeId} />

      {/* Mesma chamada do resumo (react-query dedupa pela queryKey): o forecast
          ja vinha no payload e estava sendo descartado como texto. */}
      <ForecastPanel forecast={aiSummary?.forecast} loading={aiSummaryLoading} />

      {/* ── Carrinhos abandonados ── R$ 7.782,96 em 51 carrinhos numa semana
          (19/09), guardados em store_carts e nunca mostrados. */}
      <CarrinhosAbandonadosCard storeSlug={storeSlug || undefined} />

      {/* ── Avaliações ──
          A loja tinha 4 avaliações com média 5,0 e o dono não via nenhuma: o
          endpoint existia, a aba de relatório existia, e a tela que ele abre
          todo dia não tocava no assunto. */}
      <Secao
        titulo="O que os clientes acharam"
        descricao="Avaliações dos últimos 30 dias."
        acoes={
          <Button
            size="sm"
            variant="ghost"
            rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
            onClick={() => navigate('/analytics?aba=avaliacoes')}
          >
            Ver todas
          </Button>
        }
      >
        {avaliacoesLoading && !avaliacoes ? (
          <Skeleton count={3} className="h-6" />
        ) : avaliacoesErro && !avaliacoes ? (
          // Sem esta guarda, uma falha de rede cairia no `leituraDeAvaliacoes(undefined)`
          // e a home diria "Nota média —", "0 avaliações", "Ninguém avaliou ainda" —
          // afirmando que a loja não tem avaliação quando na verdade a consulta caiu.
          <FalhaAoCarregar
            titulo="Não foi possível carregar as avaliações"
            onTentarDeNovo={() => recarregarAvaliacoes()}
          />
        ) : (
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <div>
              <p className="mb-1 text-caption text-fg-muted-token">Nota média</p>
              <p className="text-3xl font-bold leading-none text-fg-token">
                {/* "0,0 estrelas" numa loja que ninguém avaliou seria uma nota
                    péssima inventada por falta de dado. */}
                {leitura.nota ?? '—'}
                {leitura.nota && <span className="ml-1 text-base font-semibold text-fg-muted-token">de 5</span>}
              </p>
              <p className="mt-1 text-xs text-fg-muted-token">
                {leitura.total} {leitura.total === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>

            <div className="min-w-[260px] flex-1">
              <p className="text-sm text-fg-token">{leitura.contexto}</p>
              <p className="mt-1 text-sm text-fg-muted-token">{leitura.recomendacao}</p>
            </div>

            {/* Pilares, do PIOR para o melhor. A ordem já é o diagnóstico:
                "nota 4,2" não diz o que consertar, "entrega 3,1" diz. */}
            {leitura.pilares.length > 0 && (
              <div className="flex w-full flex-wrap gap-x-8 gap-y-3 border-t border-border-token pt-3">
                {leitura.pilares.map((p, i) => (
                  <div key={p.chave}>
                    <p className="mb-0.5 text-caption text-fg-muted-token">{p.rotulo}</p>
                    <p className={`text-xl font-bold leading-none ${
                      i === 0 && (p.media as number) < 4.5 ? 'text-warning-token' : 'text-fg-token'
                    }`}>
                      {(p.media as number).toFixed(1).replace('.', ',')}
                    </p>
                    {/* O volume junto: cada pilar tem o seu, porque responder é
                        opcional e quem retira não avalia entrega. */}
                    <p className="mt-0.5 text-badge text-fg-muted-token">
                      {p.total} {p.total === 1 ? 'nota' : 'notas'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {comentarios.length > 0 && (
              <div className="w-full space-y-2 border-t border-border-token pt-3">
                {comentarios.map((r, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-fg-token" aria-label={`${r.rating} de 5 estrelas`}>
                      {'★'.repeat(r.rating)}
                      <span className="text-fg-muted-token">{'★'.repeat(Math.max(0, 5 - r.rating))}</span>
                    </span>
                    <span className="ml-2 text-fg-muted-token">
                      {r.customer_name || 'Cliente'}: “{r.comment}”
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Secao>

      {/* ── Saúde do sistema (só equipe) ── */}
      {user?.is_staff && (
        <Secao
          titulo="Saúde do sistema"
          descricao="Visível só para a equipe."
          acoes={
            <>
              <SeloDeEstado tone={saude.tone} ponto>{saude.rotulo}</SeloDeEstado>
              {perdidas > 0 && (
                <SeloDeEstado tone="danger">{perdidas} mensagens perdidas</SeloDeEstado>
              )}
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                onClick={() => navigate('/analytics')}
              >
                Ver analytics
              </Button>
            </>
          }
        >
          {healthLoading && !projectHealth ? (
            <Skeleton count={3} className="h-8" />
          ) : projectHealth ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Comércio e mensagens: três números cada, lidos em linha. */}
              {[
                [
                  { rotulo: 'Pedidos 24h', valor: projectHealth.commerce.orders_24h, sub: `${formatCurrency(projectHealth.commerce.revenue_today)} hoje` },
                  {
                    rotulo: 'Ticket médio',
                    valor: formatCurrency(projectHealth.commerce.avg_ticket_month),
                    sub: projectHealth.commerce.cancelled_7d > 0
                      ? `${projectHealth.commerce.cancelled_7d} cancel. (7d)`
                      : 'sem cancelamentos',
                    subAlerta: projectHealth.commerce.cancelled_7d > 0,
                  },
                  {
                    rotulo: 'Pag. pendentes',
                    valor: projectHealth.commerce.payment_pending,
                    sub: 'aguardando',
                    tom: projectHealth.commerce.payment_pending > 0 ? 'text-warning-token' : undefined,
                  },
                ],
                [
                  {
                    rotulo: 'Mensagens 24h',
                    valor: projectHealth.messaging.messages_24h,
                    sub: `${projectHealth.messaging.inbound_24h}↓ · ${projectHealth.messaging.outbound_24h}↑`,
                  },
                  {
                    rotulo: 'Conversas',
                    valor: projectHealth.messaging.open_conversations,
                    sub: `${projectHealth.messaging.human_conversations} c/ humano`,
                  },
                  {
                    rotulo: 'Andamento',
                    valor: perdidas,
                    sub: `perdidas · ${projectHealth.automation.pipeline.timeouts} timeouts`,
                    tom: perdidas > 0 ? 'text-danger-token' : undefined,
                  },
                ],
              ].map((grupo, g) => (
                <dl key={g} className="grid grid-cols-3 gap-3 rounded-lg bg-surface-2 p-3">
                  {grupo.map((m) => (
                    <div key={m.rotulo} className="min-w-0">
                      <dt className="text-caption text-fg-muted-token">{m.rotulo}</dt>
                      <dd className={`mt-1 text-xl font-bold tabular-nums ${m.tom ?? 'text-fg-token'}`}>{m.valor}</dd>
                      <dd className={`mt-0.5 text-badge ${m.subAlerta ? 'text-danger-token' : 'text-fg-muted-token'}`}>{m.sub}</dd>
                    </div>
                  ))}
                </dl>
              ))}

              {/* Catálogo, agentes, intenções e alertas. */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    {
                      rotulo: 'Est. baixo',
                      valor: projectHealth.catalog.low_stock_products,
                      Icone: CubeIcon,
                      alerta: projectHealth.catalog.low_stock_products > 0,
                    },
                    { rotulo: 'Agentes', valor: projectHealth.automation.active_agents, Icone: BoltIcon, alerta: false },
                    {
                      rotulo: 'Alertas',
                      valor: projectHealth.issues.length,
                      Icone: ExclamationTriangleIcon,
                      alerta: projectHealth.issues.length > 0,
                    },
                  ].map(({ rotulo, valor, Icone, alerta }) => (
                    <div key={rotulo} className="rounded-lg bg-surface-2 p-2.5">
                      <Icone
                        aria-hidden
                        className={`mx-auto mb-1 h-3.5 w-3.5 ${alerta ? 'text-warning-token' : 'text-fg-muted-token'}`}
                      />
                      <p className={`text-sm font-bold ${alerta ? 'text-warning-token' : 'text-fg-token'}`}>{valor}</p>
                      <p className="text-badge text-fg-muted-token">{rotulo}</p>
                    </div>
                  ))}
                </div>

                {/* Intenções mais frequentes no pipeline */}
                {projectHealth.automation.pipeline.intent_log_summary?.length > 0 && (
                  <div>
                    <p className="mb-2 text-caption text-fg-muted-token">
                      Intenções mais frequentes ({projectHealth.automation.pipeline.period_hours}h)
                    </p>
                    <ul className="space-y-1.5">
                      {projectHealth.automation.pipeline.intent_log_summary.slice(0, 4).map((item) => {
                        const total = projectHealth.automation.pipeline.total_messages || 1;
                        const pct = Math.round((item.count / total) * 100);
                        const nome = item.intent_type.replace(/_/g, ' ');
                        return (
                          <li key={item.intent_type} className="flex items-center gap-2">
                            <span className="flex-1 truncate text-badge text-fg-muted-token capitalize">
                              {nome}
                            </span>
                            <Progresso pct={Math.max(pct, 8)} rotulo={`${nome}: ${item.count}`} className="w-16" />
                            <span className="w-5 text-right text-badge font-bold tabular-nums text-fg-token">{item.count}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {projectHealth.issues.length > 0 ? (
                  <ul className="space-y-1.5">
                    {projectHealth.issues.slice(0, 2).map((issue, idx) => (
                      <li key={`${issue.area}-${idx}`}>
                        <Button
                          variant="outline"
                          className={`h-auto w-full flex-col items-start gap-0.5 p-2.5 text-left font-normal ${
                            issue.level === 'critical'
                              ? 'border-danger-token'
                              : issue.level === 'warning'
                              ? 'border-warning-token'
                              : ''
                          }`}
                          onClick={() => navigate(destinoDoAlerta(issue.area, storeRoute))}
                        >
                          <span className="line-clamp-1 text-xs font-semibold text-fg-token">{issue.title}</span>
                          <span className="line-clamp-1 text-badge text-fg-muted-token">{issue.detail}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Verificacao ok rotulo="Nenhum alerta operacional" />
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-fg-muted-token">Saúde do sistema indisponível.</p>
          )}
        </Secao>
      )}
    </PageShell>
  );
};

export default DashboardPage;
