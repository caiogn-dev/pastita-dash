/**
 * Novo pedido — página dedicada do desktop (28/10).
 *
 * A gaveta em 4 passos é boa no celular, mas no balcão do computador
 * escolher item virava uma lista de 72 px de altura dentro do passo 3. Aqui é
 * uma tela só, no modelo do Prefiro: categorias à esquerda, cartões dos
 * produtos no meio (clicou, entrou), e o pedido inteiro à direita — itens,
 * ajustes, entrega, pagamento e o botão que diz o que falta.
 *
 * A lógica (cliente, frete, criação) é a mesma do assistente:
 * `useNewOrderWizard`. Só a tela muda.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MinusIcon, PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PageShell, SearchInput, Button, Segmentado, Input, Textarea, Switch } from '../../../components/ui';
import { useStore } from '../../../hooks';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { precoVigenteDoProduto } from '../../../utils/precoVigente';
import { useNewOrderWizard, type NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';
import { useProdutosDaLoja } from '../../../components/orders/newOrder/useProdutosDaLoja';
import { StepCliente } from '../../../components/orders/newOrder/steps/StepCliente';
import { StepEntrega } from '../../../components/orders/newOrder/steps/StepEntrega';
import { PAYMENT_LABELS, type PaymentMethod } from '../../../components/orders/newOrder/types';
import { rascunhoDoEstado } from '../../../components/orders/newOrder/rascunhoDaConversa';
import { categoriasDoCatalogo, filtrarCatalogo, seloDeEstoque } from './catalogoDoPedido';

const TOM_DO_SELO = {
  ok: 'bg-success-soft text-success-token',
  alerta: 'bg-warning-soft text-warning-token',
  perigo: 'bg-danger-soft text-danger-token',
} as const;

/** O que ainda impede concluir — o botão diz, em vez de só ficar cinza. */
export function oQueFalta(wiz: Pick<NewOrderWizard, 'customer' | 'cart' | 'deliveryMethod' | 'freeAddressText' | 'routeQuote' | 'enableScheduling' | 'scheduledDate' | 'scheduledTime'>): string | null {
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
  return null;
}

function Bloco({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3 border-t border-border-token pt-4 first:border-0 first:pt-0', className)}>
      <h2 className="text-sm font-semibold text-fg-token">{titulo}</h2>
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

  const subtotal = wiz.cart.reduce((s, c) => s + precoVigenteDoProduto(c.product) * c.quantity, 0);
  const frete = wiz.deliveryMethod === 'delivery' ? (wiz.routeQuote?.fee ?? 0) : 0;
  const descontoBruto = parseFloat(wiz.discountValue) || 0;
  const desconto = wiz.discountType === 'percent' ? Math.round(subtotal * descontoBruto) / 100 : descontoBruto;
  const acrescimo = parseFloat(wiz.surchargeValue) || 0;
  const total = Math.max(0, subtotal + frete + acrescimo - desconto);
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
      <div className="superficie mb-4 p-4">
        <StepCliente
          storeSlug={wiz.storeSlug}
          customer={wiz.customer}
          onCustomerSelected={wiz.setCustomer}
          onCustomerCleared={() => wiz.setCustomer(null)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_26rem]">
        {/* Categorias + busca */}
        <aside className="superficie h-fit space-y-3 p-3 lg:sticky lg:top-4">
          <SearchInput
            ref={buscaRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ( / )"
            aria-label="Buscar produto"
            onKeyDown={(e) => { if (e.key === 'Enter' && visiveis[0]) adicionar(visiveis[0].id); }}
          />
          <nav aria-label="Categorias" className="flex flex-col gap-1">
            {[{ nome: null as string | null, rotulo: 'Todos', quantidade: produtos.length },
              ...categorias.map((c) => ({ nome: c.nome as string | null, rotulo: c.nome, quantidade: c.quantidade }))]
              .map((c) => (
                <button
                  key={c.rotulo}
                  type="button"
                  aria-pressed={categoria === c.nome && !busca}
                  onClick={() => { setCategoria(c.nome); setBusca(''); }}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    categoria === c.nome && !busca
                      ? 'bg-brand-soft font-semibold text-brand-ink'
                      : 'text-fg-token hover:bg-surface-2',
                  )}
                >
                  <span className="truncate">{c.rotulo}</span>
                  <span className="text-xs text-fg-muted-token tabular-nums">{c.quantidade}</span>
                </button>
              ))}
          </nav>
        </aside>

        {/* Produtos */}
        <section aria-label="Produtos" className="min-w-0">
          {carregando ? (
            <p className="py-10 text-center text-sm text-fg-muted-token">Carregando produtos…</p>
          ) : visiveis.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-muted-token">
              {busca ? `Nada encontrado para "${busca}"` : 'Nenhum produto nesta categoria'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
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
                      'relative flex min-h-[5.5rem] flex-col justify-between rounded-xl border p-3 text-left transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      n > 0 ? 'border-brand bg-brand-soft' : 'border-border-token bg-surface hover:border-brand hover:bg-surface-2',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-fg-token">{p.name}</span>
                      {n > 0 && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-on-brand">
                          {n}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span className="text-sm font-semibold text-fg-token tabular-nums">
                        {formatCurrency(precoVigenteDoProduto(p))}
                      </span>
                      {selo && (
                        <span className={cn('rounded-full px-2 py-0.5 text-badge font-semibold', TOM_DO_SELO[selo.tom])}>
                          {selo.texto}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* O pedido */}
        <aside aria-label="Pedido" className="superficie h-fit space-y-4 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <Bloco titulo={`Itens${wiz.cart.length ? ` (${wiz.cart.reduce((s, c) => s + c.quantity, 0)})` : ''}`}>
            {wiz.cart.length === 0 ? (
              <p className="text-sm text-fg-muted-token">Clique num produto para adicionar.</p>
            ) : (
              <ul className="divide-y divide-border-token">
                {wiz.cart.map((item) => {
                  const unit = precoVigenteDoProduto(item.product);
                  return (
                    <li key={item.product.id} className="flex items-center gap-2 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Diminuir ${item.product.name}`}
                          onClick={() => (item.quantity > 1 ? wiz.changeQty(item.product.id, item.quantity - 1) : wiz.removeFromCart(item.product.id))}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-border-token text-fg-muted-token hover:bg-surface-2"
                        >
                          <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums text-fg-token">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Aumentar ${item.product.name}`}
                          onClick={() => wiz.changeQty(item.product.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-border-token text-fg-muted-token hover:bg-surface-2"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg-token">{item.product.name}</p>
                        <p className="text-xs text-fg-muted-token tabular-nums">{formatCurrency(unit)} un.</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-fg-token">{formatCurrency(unit * item.quantity)}</span>
                      <button
                        type="button"
                        aria-label={`Remover ${item.product.name}`}
                        onClick={() => wiz.removeFromCart(item.product.id)}
                        className="p-1 text-fg-muted-token hover:text-danger-token"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Textarea
              label="Observação do pedido"
              rows={2}
              value={wiz.observacoes}
              onChange={(e) => wiz.setObservacoes(e.target.value)}
            />
          </Bloco>

          <Bloco titulo="Desconto e acréscimo">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
              <Segmentado
                rotulo="Tipo de desconto"
                valor={wiz.discountType}
                onChange={wiz.setDiscountType}
                opcoes={[{ valor: 'fixed', rotulo: 'R$' }, { valor: 'percent', rotulo: '%' }]}
              />
              <Input
                label="Desconto"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={wiz.discountValue}
                onChange={(e) => wiz.setDiscountValue(e.target.value)}
              />
            </div>
            <Input
              label="Acréscimo (R$)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={wiz.surchargeValue}
              onChange={(e) => wiz.setSurchargeValue(e.target.value)}
            />
            {(desconto > 0 || acrescimo > 0) && (
              <Input
                label="Motivo"
                value={wiz.discountReason}
                onChange={(e) => wiz.setDiscountReason(e.target.value)}
              />
            )}
          </Bloco>

          <Bloco titulo="Entrega">
            <StepEntrega
              customer={wiz.customer}
              deliveryMethod={wiz.deliveryMethod}
              setDeliveryMethod={wiz.setDeliveryMethod}
              selectedAddress={wiz.selectedAddress}
              setSelectedAddress={wiz.setSelectedAddress}
              escolherEnderecoSalvo={wiz.escolherEnderecoSalvo}
              freeAddressText={wiz.freeAddressText}
              setFreeAddressText={wiz.setFreeAddressText}
              routeQuote={wiz.routeQuote}
              calculatingRoute={wiz.calculatingRoute}
              onCalculateRoute={wiz.handleCalculateRoute}
              onUseSharedLocation={wiz.handleUseSharedLocation}
              customerHasPhone={wiz.customerHasPhone}
              enableScheduling={wiz.enableScheduling}
              setEnableScheduling={wiz.setEnableScheduling}
              scheduledDate={wiz.scheduledDate}
              setScheduledDate={wiz.setScheduledDate}
              scheduledTime={wiz.scheduledTime}
              setScheduledTime={wiz.setScheduledTime}
              storeSlug={wiz.storeSlug}
            />
          </Bloco>

          <Bloco titulo="Pagamento">
            <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={wiz.paymentMethod === m}
                  onClick={() => wiz.setPaymentMethod(m)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                    wiz.paymentMethod === m
                      ? 'border-brand bg-brand-soft text-brand-ink'
                      : 'border-border-token text-fg-token hover:bg-surface-2',
                  )}
                >
                  {PAYMENT_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-fg-token">
              Não avisar o cliente no WhatsApp
              <Switch
                ligado={wiz.suppressNotifications}
                onMudar={wiz.setSuppressNotifications}
                rotulo="Não avisar o cliente no WhatsApp"
              />
            </div>
          </Bloco>

          <div className="space-y-1 border-t border-border-token pt-4 text-sm">
            <Linha rotulo="Subtotal" valor={subtotal} />
            {wiz.deliveryMethod === 'delivery' && <Linha rotulo="Frete" valor={frete} />}
            {acrescimo > 0 && <Linha rotulo="Acréscimo" valor={acrescimo} />}
            {desconto > 0 && <Linha rotulo="Desconto" valor={-desconto} />}
            <div className="flex items-baseline justify-between pt-2">
              <span className="font-semibold text-fg-token">Total</span>
              <span className="text-xl font-bold tabular-nums text-fg-token" data-testid="total-do-pedido">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Button
              className="w-full justify-center"
              disabled={Boolean(falta)}
              isLoading={wiz.submitting}
              onClick={concluir}
              title="Ctrl+Enter"
            >
              Concluir pedido
            </Button>
            {falta && <p className="text-center text-xs text-danger-token">{falta}</p>}
          </div>
        </aside>
      </div>
    </PageShell>
  );
};

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex justify-between text-fg-muted-token">
      <span>{rotulo}</span>
      <span className="tabular-nums">{valor < 0 ? `− ${formatCurrency(-valor)}` : formatCurrency(valor)}</span>
    </div>
  );
}

export default NovoPedidoPage;
