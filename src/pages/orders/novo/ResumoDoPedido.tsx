/**
 * O pedido em si: itens em linhas (qtd · item · un. · total), ajustes que só
 * abrem quando chamados — observação, desconto, acréscimo, cupom — e a conta.
 * Antes eram seis campos abertos ao mesmo tempo, quase todos vazios.
 */
import React, { useState } from 'react';
import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Input, Segmentado, Textarea } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { getErrorMessage } from '../../../services/api';
import { precoVigenteDoProduto } from '../../../utils/precoVigente';
import { ordersService } from '../../../services/orders';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

type Conta = { subtotal: number; frete: number; acrescimo: number; desconto: number; cupom: number; total: number };

/** A conta que a tela mostra — a mesma regra que o servidor aplica ao criar. */
export function contaDoPedido(wiz: Pick<NewOrderWizard,
  'cart' | 'deliveryMethod' | 'routeQuote' | 'discountType' | 'discountValue' | 'surchargeValue' | 'cupom'>): Conta {
  const subtotal = wiz.cart.reduce((s, c) => s + precoVigenteDoProduto(c.product) * c.quantity, 0);
  const frete = wiz.deliveryMethod === 'delivery' ? (wiz.routeQuote?.fee ?? 0) : 0;
  const bruto = parseFloat(wiz.discountValue) || 0;
  const desconto = wiz.discountType === 'percent' ? Math.round(subtotal * bruto) / 100 : bruto;
  const acrescimo = parseFloat(wiz.surchargeValue) || 0;
  const cupom = wiz.cupom?.desconto ?? 0;
  return { subtotal, frete, acrescimo, desconto, cupom, total: Math.max(0, subtotal + frete + acrescimo - desconto - cupom) };
}

type Ajuste = 'obs' | 'desconto' | 'acrescimo' | 'cupom';

function Chip({ children, onRemover, rotulo }: { children: React.ReactNode; onRemover: () => void; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-xs text-fg-token">
      {children}
      <button type="button" aria-label={`Tirar ${rotulo}`} onClick={onRemover} className="rounded-full p-0.5 hover:bg-surface">
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function ResumoDoPedido({ wiz }: { wiz: NewOrderWizard }) {
  const [aberto, setAberto] = useState<Ajuste | null>(null);
  const [codigo, setCodigo] = useState('');
  const [erroDoCupom, setErroDoCupom] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const conta = contaDoPedido(wiz);
  const itens = wiz.cart.reduce((s, c) => s + c.quantity, 0);
  const alternar = (a: Ajuste) => setAberto((x) => (x === a ? null : a));

  const aplicarCupom = async () => {
    if (!codigo.trim()) return;
    setConferindo(true);
    setErroDoCupom(null);
    try {
      const tel = (wiz.customer?.phone_number_edited || wiz.customer?.phone_number || '').replace(/\D/g, '');
      const r = await ordersService.validarCupom(wiz.storeSlug, codigo.trim(), conta.subtotal, tel || undefined);
      if (r.valido) {
        wiz.setCupom({ codigo: r.codigo, desconto: r.desconto });
        setAberto(null);
        setCodigo('');
      } else {
        setErroDoCupom(r.erro);
      }
    } catch (err) {
      setErroDoCupom(getErrorMessage(err) || 'Não deu para conferir o cupom');
    } finally {
      setConferindo(false);
    }
  };

  return (
    <div className="space-y-4">
      {wiz.cart.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-token py-6 text-center text-sm text-fg-muted-token">
          Clique num produto para adicionar
        </p>
      ) : (
        <ul className="divide-y divide-border-token text-sm" aria-label={`Itens (${itens})`}>
          {wiz.cart.map((item) => {
            const unit = precoVigenteDoProduto(item.product);
            return (
              <li key={item.product.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 py-2">
                <div className="inline-flex items-center rounded-full border border-border-token">
                  <button
                    type="button"
                    aria-label={`Diminuir ${item.product.name}`}
                    onClick={() => (item.quantity > 1 ? wiz.changeQty(item.product.id, item.quantity - 1) : wiz.removeFromCart(item.product.id))}
                    className="p-1 text-fg-muted-token hover:text-fg-token"
                  >
                    <MinusIcon className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.product.name}`}
                    onClick={() => wiz.changeQty(item.product.id, item.quantity + 1)}
                    className="p-1 text-fg-muted-token hover:text-fg-token"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-fg-token">{item.product.name}</p>
                  <p className="text-xs text-fg-muted-token tabular-nums">{formatCurrency(unit)} un.</p>
                </div>
                <span className="font-semibold tabular-nums text-fg-token">{formatCurrency(unit * item.quantity)}</span>
                <button
                  type="button"
                  aria-label={`Remover ${item.product.name}`}
                  onClick={() => wiz.removeFromCart(item.product.id)}
                  className="p-1 text-fg-muted-token hover:text-danger-token"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ajustes: um botão por ajuste; preenchido, vira etiqueta com X. */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {([['obs', 'Observação'], ['desconto', 'Desconto'], ['acrescimo', 'Acréscimo'], ['cupom', 'Cupom']] as const).map(([k, r]) => (
            <button
              key={k}
              type="button"
              aria-expanded={aberto === k}
              onClick={() => alternar(k)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                aberto === k ? 'border-brand bg-brand-soft text-brand-ink' : 'border-border-token text-fg-muted-token hover:text-fg-token',
              )}
            >
              + {r}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {wiz.observacoes.trim() && aberto !== 'obs' && (
            <Chip rotulo="observação" onRemover={() => wiz.setObservacoes('')}>
              <span className="max-w-[14rem] truncate">“{wiz.observacoes.trim()}”</span>
            </Chip>
          )}
          {conta.desconto > 0 && aberto !== 'desconto' && (
            <Chip rotulo="desconto" onRemover={() => wiz.setDiscountValue('')}>Desconto −{formatCurrency(conta.desconto)}</Chip>
          )}
          {conta.acrescimo > 0 && aberto !== 'acrescimo' && (
            <Chip rotulo="acréscimo" onRemover={() => wiz.setSurchargeValue('')}>Acréscimo +{formatCurrency(conta.acrescimo)}</Chip>
          )}
          {wiz.cupom && (
            <Chip rotulo="cupom" onRemover={() => wiz.setCupom(null)}>
              Cupom {wiz.cupom.codigo} −{formatCurrency(wiz.cupom.desconto)}
            </Chip>
          )}
        </div>

        {aberto === 'obs' && (
          <Textarea
            label="Observação do pedido"
            rows={2}
            autoFocus
            value={wiz.observacoes}
            onChange={(e) => wiz.setObservacoes(e.target.value)}
          />
        )}
        {aberto === 'desconto' && (
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
              autoFocus
              value={wiz.discountValue}
              onChange={(e) => wiz.setDiscountValue(e.target.value)}
            />
            <Input
              className="col-span-2"
              label="Motivo (opcional)"
              value={wiz.discountReason}
              onChange={(e) => wiz.setDiscountReason(e.target.value)}
            />
          </div>
        )}
        {aberto === 'acrescimo' && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Acréscimo (R$)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              value={wiz.surchargeValue}
              onChange={(e) => wiz.setSurchargeValue(e.target.value)}
            />
            <Input label="Motivo (opcional)" value={wiz.surchargeReason} onChange={(e) => wiz.setSurchargeReason(e.target.value)} />
          </div>
        )}
        {aberto === 'cupom' && (
          <div className="flex items-end gap-2">
            <Input
              className="flex-1"
              label="Código do cupom"
              autoFocus
              value={codigo}
              error={erroDoCupom ?? undefined}
              onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setErroDoCupom(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void aplicarCupom(); } }}
            />
            <Button variant="outline" isLoading={conferindo} disabled={!codigo.trim() || wiz.cart.length === 0} onClick={() => void aplicarCupom()}>
              Aplicar
            </Button>
          </div>
        )}
      </div>

      <dl className="space-y-1 border-t border-border-token pt-3 text-sm">
        <Linha rotulo="Subtotal" valor={conta.subtotal} />
        {wiz.deliveryMethod === 'delivery' && <Linha rotulo="Frete" valor={conta.frete} />}
        {conta.acrescimo > 0 && <Linha rotulo="Acréscimo" valor={conta.acrescimo} />}
        {conta.desconto > 0 && <Linha rotulo="Desconto" valor={-conta.desconto} />}
        {conta.cupom > 0 && <Linha rotulo={`Cupom ${wiz.cupom?.codigo ?? ''}`} valor={-conta.cupom} />}
        <div className="flex items-baseline justify-between pt-1">
          <dt className="font-semibold text-fg-token">Total</dt>
          <dd className="text-xl font-bold tabular-nums text-fg-token" data-testid="total-do-pedido">{formatCurrency(conta.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex justify-between text-fg-muted-token">
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{valor < 0 ? `− ${formatCurrency(-valor)}` : formatCurrency(valor)}</dd>
    </div>
  );
}
