/**
 * Novo pedido — assistente em 4 passos (28/10).
 *
 *   1 Cliente → 2 Itens → 3 Entrega → 4 Pagamento
 *
 * Um passo por vez, ocupando a tela; o pedido (itens e conta) fica sempre à
 * direita com o botão que segue. A versão anterior punha as quatro perguntas
 * na mesma tela e o dono se perdia: "não está no fluxo, estou me perdendo
 * para lançar pedidos". A trilha deixa voltar a qualquer passo.
 *
 * A lógica (cliente, frete, criação) é a mesma do assistente do celular:
 * `useNewOrderWizard`. Só a tela muda.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
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
import { EscolhasDoCombo } from './EscolhasDoCombo';
import { chaveDoCombo, comboComoProduto, comboDoProduto, precoDoCombo, resumoDasEscolhas } from './combosDoPedido';
import type { StoreCombo } from '../../../services/storesApi';

const SEM_COMBOS: StoreCombo[] = [];

const TOM_DO_SELO = {
  ok: 'bg-success-soft text-success-token',
  alerta: 'bg-warning-soft text-warning-token',
  perigo: 'bg-danger-soft text-danger-token',
} as const;

type CamposDoQueFalta = Pick<NewOrderWizard, 'customer' | 'cart' | 'deliveryMethod' | 'freeAddressText' | 'routeQuote' | 'enableScheduling' | 'scheduledDate' | 'scheduledTime' | 'paymentMethod' | 'bandeiraDoVale'>;

export const PASSOS = [
  { id: 'cliente', rotulo: 'Cliente', pergunta: 'Quem é o cliente?' },
  { id: 'itens', rotulo: 'Itens', pergunta: 'O que vai no pedido?' },
  { id: 'entrega', rotulo: 'Entrega', pergunta: 'Entrega ou retirada?' },
  { id: 'pagamento', rotulo: 'Pagamento', pergunta: 'Como vai pagar?' },
] as const;
export type Passo = typeof PASSOS[number]['id'];

/** O que segura cada passo — o botão diz, em vez de só ficar cinza. */
export function faltaNoPasso(passo: Passo, wiz: CamposDoQueFalta): string | null {
  if (passo === 'cliente') {
    if (!wiz.customer) return 'Escolha o cliente';
    if (wiz.customer.id === '') {
      const tel = (wiz.customer.phone_number_edited || wiz.customer.phone_number || '').replace(/\D/g, '');
      if (tel.length < 10) return 'Informe o telefone do cliente';
    }
  }
  if (passo === 'itens' && wiz.cart.length === 0) return 'Adicione pelo menos um item';
  if (passo === 'entrega') {
    if (wiz.deliveryMethod === 'delivery') {
      if (!wiz.freeAddressText.trim()) return 'Informe o endereço de entrega';
      if (!wiz.routeQuote) return 'Calcule o frete';
    }
    if (wiz.enableScheduling && (!wiz.scheduledDate || !wiz.scheduledTime)) return 'Escolha a data e a faixa do agendamento';
  }
  if (passo === 'pagamento' && wiz.paymentMethod === 'voucher_on_delivery' && !wiz.bandeiraDoVale) {
    return 'Escolha a bandeira do vale';
  }
  return null;
}

/** Primeiro passo com pendência — é para onde "Falta: …" leva. */
export function passoPendente(wiz: CamposDoQueFalta): Passo | null {
  return PASSOS.find((p) => faltaNoPasso(p.id, wiz))?.id ?? null;
}

/** O que ainda impede concluir o pedido inteiro. */
export function oQueFalta(wiz: CamposDoQueFalta): string | null {
  const passo = passoPendente(wiz);
  return passo ? faltaNoPasso(passo, wiz) : null;
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

  const { produtos: soProdutos, combos = SEM_COMBOS, carregando } = useProdutosDaLoja(wiz.productStoreKey);
  // Combos entram no catálogo como cartões da categoria "Combos", na frente.
  const produtos = useMemo(() => [...combos.map(comboComoProduto), ...soProdutos], [combos, soProdutos]);
  const [comboAberto, setComboAberto] = useState<StoreCombo | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const [passo, setPasso] = useState<Passo>('cliente');

  const categorias = useMemo(() => categoriasDoCatalogo(produtos), [produtos]);
  const visiveis = useMemo(() => filtrarCatalogo(produtos, categoria, busca), [produtos, categoria, busca]);
  const qtd = new Map<string, number>();
  for (const c of wiz.cart) {
    // Linhas do mesmo combo (escolhas diferentes) somam no cartão dele.
    const chave = c.combo ? `combo:${c.combo.id}` : c.product.id;
    qtd.set(chave, (qtd.get(chave) ?? 0) + c.quantity);
  }
  const itensNoPedido = wiz.cart.reduce((n, c) => n + c.quantity, 0);
  const conta = contaDoPedido(wiz);

  const indice = PASSOS.findIndex((p) => p.id === passo);
  const ultimo = indice === PASSOS.length - 1;
  const faltaAqui = faltaNoPasso(passo, wiz);
  const pendente = passoPendente(wiz);
  const falta = oQueFalta(wiz);

  const irPara = (p: Passo) => setPasso(p);
  const seguir = () => {
    if (faltaAqui) return;
    if (ultimo) { if (!falta) void wiz.handleSubmit(); return; }
    setPasso(PASSOS[indice + 1].id);
  };

  // Itens: a busca já vem com o cursor.
  useEffect(() => {
    if (passo === 'itens') buscaRef.current?.focus();
  }, [passo]);

  // Atalhos do balcão: "/" busca produto; Ctrl+Enter segue (ou conclui).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
      if (e.key === '/' && !digitando && passo === 'itens') { e.preventDefault(); buscaRef.current?.focus(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); seguir(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const adicionar = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    const combo = comboDoProduto(p);
    if (combo) { setComboAberto(combo); return; }
    const atual = qtd.get(id) ?? 0;
    if (atual > 0) wiz.changeQty(id, atual + 1);
    else wiz.addToCart(p);
  };

  const opcoesDeCategoria = [
    { nome: null as string | null, rotulo: 'Todos', quantidade: produtos.length },
    ...categorias.map((c) => ({ nome: c.nome as string | null, rotulo: c.nome, quantidade: c.quantidade })),
  ];

  // O que cada passo já decidiu, na própria trilha.
  const resumoDoPasso: Record<Passo, string> = {
    cliente: wiz.customer ? (wiz.customer.name || 'Cliente novo') : '',
    itens: itensNoPedido ? `${itensNoPedido} ${itensNoPedido === 1 ? 'item' : 'itens'}` : '',
    entrega: wiz.deliveryMethod === 'pickup' ? 'Retirada' : (wiz.routeQuote ? 'Entrega' : ''),
    pagamento: '',
  };

  const catalogo = (
    <div className="grid items-start gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-4">
        <SearchInput
          ref={buscaRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ( / )"
          aria-label="Buscar produto"
          onKeyDown={(e) => { if (e.key === 'Enter' && visiveis[0]) adicionar(visiveis[0].id); }}
        />
        <nav aria-label="Categorias" className="flex gap-1 overflow-x-auto lg:max-h-[calc(100vh-16rem)] lg:flex-col lg:gap-0.5 lg:overflow-y-auto">
          {opcoesDeCategoria.map((c) => {
            const ativa = categoria === c.nome && !busca;
            return (
              <button
                key={c.rotulo}
                type="button"
                aria-pressed={ativa}
                onClick={() => { setCategoria(c.nome); setBusca(''); }}
                className={cn(
                  'flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4">
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
    </div>
  );

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
        {/* Trilha: número, nome e o que o passo já decidiu. Volta a qualquer um. */}
        <nav aria-label="Passos do pedido">
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {PASSOS.map((p, i) => {
              const ativo = p.id === passo;
              const feito = !faltaNoPasso(p.id, wiz) && i < indice;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={ativo ? 'step' : undefined}
                    onClick={() => irPara(p.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      ativo ? 'border-brand bg-brand-soft' : 'border-border-token bg-surface hover:border-brand',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        ativo ? 'bg-brand text-on-brand' : feito ? 'bg-success-soft text-success-token' : 'bg-surface-2 text-fg-muted-token',
                      )}
                    >
                      {feito ? <CheckIcon className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg-token">{p.rotulo}</span>
                      <span className="block truncate text-xs text-fg-muted-token">{resumoDoPasso[p.id] || '—'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
          <section aria-label={PASSOS[indice].rotulo} className="superficie min-w-0 p-5">
            <h2 className="mb-4 text-lg font-semibold text-fg-token">{PASSOS[indice].pergunta}</h2>
            {passo === 'cliente' && (
              <ClienteDoPedido wiz={wiz} onEscolhido={() => setPasso('itens')} />
            )}
            {passo === 'itens' && catalogo}
            {passo === 'entrega' && <EntregaDoPedido wiz={wiz} />}
            {passo === 'pagamento' && (
              <div className="space-y-6">
                <PagamentoDoPedido wiz={wiz} total={conta.total} />
                <div className="flex items-center justify-between gap-3 border-t border-border-token pt-4 text-sm text-fg-token">
                  <span>Avisar o cliente no WhatsApp</span>
                  <Switch
                    ligado={!wiz.suppressNotifications}
                    onMudar={(v) => wiz.setSuppressNotifications(!v)}
                    rotulo="Avisar o cliente no WhatsApp"
                  />
                </div>
              </div>
            )}
          </section>

          <aside aria-label="Pedido" className="space-y-3 lg:sticky lg:top-4">
            <Cartao titulo="Pedido"><ResumoDoPedido wiz={wiz} /></Cartao>
            <div className="superficie space-y-2 p-4">
              <div className="flex gap-2">
                {indice > 0 && (
                  <Button variant="outline" size="lg" onClick={() => setPasso(PASSOS[indice - 1].id)} aria-label="Voltar">
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="flex-1 justify-center"
                  size="lg"
                  disabled={Boolean(faltaAqui) || (ultimo && Boolean(falta))}
                  isLoading={wiz.submitting}
                  onClick={seguir}
                  title="Ctrl+Enter"
                >
                  {ultimo ? `Concluir · ${formatCurrency(conta.total)}` : `Continuar · ${PASSOS[indice + 1].rotulo}`}
                </Button>
              </div>
              {faltaAqui ? (
                <p className="text-center text-xs text-danger-token">{faltaAqui}</p>
              ) : ultimo && falta && pendente ? (
                <button
                  type="button"
                  onClick={() => irPara(pendente)}
                  className="w-full text-center text-xs text-danger-token underline"
                >
                  {falta}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
      {comboAberto && (
        <EscolhasDoCombo
          combo={comboAberto}
          onFechar={() => setComboAberto(null)}
          onAdicionar={(escolhas) => {
            const c = comboAberto;
            wiz.addComboToCart({
              product: { ...comboComoProduto(c), id: chaveDoCombo(c.id, escolhas), price: precoDoCombo(c, escolhas) },
              quantity: 1,
              combo: { id: c.id, selections: escolhas, resumo: resumoDasEscolhas(c, escolhas) },
            });
            setComboAberto(null);
          }}
        />
      )}
    </PageShell>
  );
};

export default NovoPedidoPage;
