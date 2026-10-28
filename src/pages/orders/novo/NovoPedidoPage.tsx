/**
 * Novo pedido — página dedicada do desktop (28/10).
 *
 * Quatro perguntas, cada uma no seu lugar e nesta ordem de leitura:
 *   topo      → QUEM (cliente) e ONDE/QUANDO (entrega, frete, horário)
 *   meio      → O QUÊ (categorias à esquerda, cartões dos produtos)
 *   direita   → O PEDIDO (itens, ajustes sob demanda, conta) e COMO PAGA
 * A primeira versão empilhava tudo na coluna da direita — o assistente do
 * celular inteiro, campo sobre campo. O dono: "parece um aglomerado".
 *
 * A lógica (cliente, frete, criação) é a mesma do assistente do celular:
 * `useNewOrderWizard`. Só a tela muda.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PageShell, SearchInput, Button, Switch } from '../../../components/ui';
import { useStore } from '../../../hooks';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { precoVigenteDoProduto } from '../../../utils/precoVigente';
import { useNewOrderWizard, type NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';
import { useProdutosDaLoja } from '../../../components/orders/newOrder/useProdutosDaLoja';
import { rascunhoDoEstado } from '../../../components/orders/newOrder/rascunhoDaConversa';
import { categoriasDoCatalogo, filtrarCatalogo, seloDeEstoque } from './catalogoDoPedido';
import { ClienteDoPedido } from './ClienteDoPedido';
import { EntregaDoPedido } from './EntregaDoPedido';
import { ResumoDoPedido, contaDoPedido } from './ResumoDoPedido';
import { PagamentoDoPedido } from './PagamentoDoPedido';

const TOM_DO_SELO = {
  ok: 'bg-success-soft text-success-token',
  alerta: 'bg-warning-soft text-warning-token',
  perigo: 'bg-danger-soft text-danger-token',
} as const;

/** O que ainda impede concluir — o botão diz, em vez de só ficar cinza. */
export function oQueFalta(wiz: Pick<NewOrderWizard, 'customer' | 'cart' | 'deliveryMethod' | 'freeAddressText' | 'routeQuote' | 'enableScheduling' | 'scheduledDate' | 'scheduledTime' | 'paymentMethod' | 'bandeiraDoVale'>): string | null {
  if (!wiz.customer) return 'Escolha o cliente';
  if (wiz.customer.id === '') {
    const tel = (wiz.customer.phone_number_edited || wiz.customer.phone_number || '').replace(/\D/g, '');
    if (tel.length < 10) return 'Informe o telefone do cliente';
  }
  if (wiz.cart.length === 0) return 'Adicione pelo menos um item';
  if (wiz.deliveryMethod === 'delivery') {
    if (!wiz.freeAddressText.trim()) return 'Informe o endereço de entrega';
    if (!wiz.routeQuote) return 'Calcule o frete';
  }
  if (wiz.enableScheduling && (!wiz.scheduledDate || !wiz.scheduledTime)) return 'Escolha a data e a faixa do agendamento';
  if (wiz.paymentMethod === 'voucher_on_delivery' && !wiz.bandeiraDoVale) return 'Escolha a bandeira do vale';
  return null;
}

function Cartao({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={titulo} className={cn('superficie p-4', className)}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted-token">{titulo}</h2>
      {children}
    </section>
  );
}

export const NovoPedidoPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId, storeSlug } = useStore();
  const voltar = () => navigate(storeId ? `/stores/${storeId}/orders` : '/orders');

  const wiz = useNewOrderWizard({
    storeSlug: storeSlug || '',
    storeId: storeId || undefined,
    onCreated: voltar,
  });

  // "Criar pedido desta conversa" (inbox) chega com o rascunho no state.
  useEffect(() => {
    const rascunho = rascunhoDoEstado(location.state);
    if (rascunho) wiz.aplicarRascunho(rascunho);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { produtos, carregando } = useProdutosDaLoja(wiz.productStoreKey);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);

  const categorias = useMemo(() => categoriasDoCatalogo(produtos), [produtos]);
  const visiveis = useMemo(() => filtrarCatalogo(produtos, categoria, busca), [produtos, categoria, busca]);
  const qtd = new Map(wiz.cart.map((c) => [c.product.id, c.quantity]));
  const conta = contaDoPedido(wiz);
  const falta = oQueFalta(wiz);

  const concluir = () => { if (!falta) void wiz.handleSubmit(); };

  // Atalhos do balcão: "/" busca produto; Ctrl+Enter conclui.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
      if (e.key === '/' && !digitando) { e.preventDefault(); buscaRef.current?.focus(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); concluir(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const adicionar = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    const atual = qtd.get(id) ?? 0;
    if (atual > 0) wiz.changeQty(id, atual + 1);
    else wiz.addToCart(p);
  };

  const opcoesDeCategoria = [
    { nome: null as string | null, rotulo: 'Todos', quantidade: produtos.length },
    ...categorias.map((c) => ({ nome: c.nome as string | null, rotulo: c.nome, quantidade: c.quantidade })),
  ];

  return (
    <PageShell
      titulo="Novo pedido"
      variante="quadro"
      acoes={
        <Button variant="outline" leftIcon={<ArrowLeftIcon className="h-4 w-4" />} onClick={voltar}>
          Quadro de pedidos
        </Button>
      }
    >
      <div className="space-y-4">
        {/* QUEM · ONDE/QUANDO */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Cartao titulo="Cliente"><ClienteDoPedido wiz={wiz} /></Cartao>
          <Cartao titulo="Entrega e horário"><EntregaDoPedido wiz={wiz} /></Cartao>
        </div>

        {/* O QUÊ · O PEDIDO */}
        <div className="grid items-start gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_24rem] xl:grid-cols-[13rem_minmax(0,1fr)_27rem]">
          <aside className="superficie space-y-3 p-3 lg:sticky lg:top-4">
            <SearchInput
              ref={buscaRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ( / )"
              aria-label="Buscar produto"
              onKeyDown={(e) => { if (e.key === 'Enter' && visiveis[0]) adicionar(visiveis[0].id); }}
            />
            <nav aria-label="Categorias" className="flex flex-col gap-0.5 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              {opcoesDeCategoria.map((c) => {
                const ativa = categoria === c.nome && !busca;
                return (
                  <button
                    key={c.rotulo}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => { setCategoria(c.nome); setBusca(''); }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      ativa ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-fg-token hover:bg-surface-2',
                    )}
                  >
                    <span className="truncate">{c.rotulo}</span>
                    <span className="text-xs tabular-nums text-fg-muted-token">{c.quantidade}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section aria-label="Produtos" className="min-w-0">
            {carregando ? (
              <p className="py-10 text-center text-sm text-fg-muted-token">Carregando produtos…</p>
            ) : visiveis.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted-token">
                {busca ? `Nada encontrado para "${busca}"` : 'Nenhum produto nesta categoria'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visiveis.map((p) => {
                  const selo = seloDeEstoque(p);
                  const n = qtd.get(p.id) ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={selo?.esgotado}
                      aria-label={`Adicionar ${p.name}`}
                      onClick={() => adicionar(p.id)}
                      className={cn(
                        'relative flex h-24 flex-col justify-between rounded-xl border p-3 text-left transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        n > 0 ? 'border-brand bg-brand-soft' : 'border-border-token bg-surface hover:border-brand',
                      )}
                    >
                      <span className="flex min-h-[1.25rem] items-start justify-end gap-1">
                        {selo && (
                          <span className={cn('rounded-full px-2 py-0.5 text-badge font-semibold', TOM_DO_SELO[selo.tom])}>
                            {selo.texto}
                          </span>
                        )}
                        {n > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-badge font-bold text-on-brand">
                            {n}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-sm font-medium leading-tight text-fg-token">{p.name}</span>
                      <span className="text-sm tabular-nums text-fg-muted-token">{formatCurrency(precoVigenteDoProduto(p))}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside aria-label="Pedido" className="space-y-4 lg:sticky lg:top-4">
            <Cartao titulo="Pedido"><ResumoDoPedido wiz={wiz} /></Cartao>
            <Cartao titulo="Pagamento">
              <PagamentoDoPedido wiz={wiz} total={conta.total} />
            </Cartao>
            <div className="superficie space-y-3 p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-fg-token">
                <span>Avisar o cliente no WhatsApp</span>
                <Switch
                  ligado={!wiz.suppressNotifications}
                  onMudar={(v) => wiz.setSuppressNotifications(!v)}
                  rotulo="Avisar o cliente no WhatsApp"
                />
              </div>
              <Button
                className="w-full justify-center"
                size="lg"
                disabled={Boolean(falta)}
                isLoading={wiz.submitting}
                onClick={concluir}
                title="Ctrl+Enter"
              >
                Concluir · {formatCurrency(conta.total)}
              </Button>
              {falta && <p className="text-center text-xs text-danger-token">{falta}</p>}
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
};

export default NovoPedidoPage;
