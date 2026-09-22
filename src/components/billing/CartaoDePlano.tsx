/**
 * Um plano do catálogo — o mesmo cartão em qualquer lugar do painel.
 *
 * Até 21/09 existiam dois desenhos diferentes para a mesma decisão: /plano
 * mostrava o que o plano inclui, /assinatura mostrava só o preço. O lojista
 * escolhia com informação diferente dependendo do caminho que tinha feito.
 */
import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { formatCurrency } from '../../utils/formatters';
import type { Plan } from '../../services/billing';
import { acaoDoPlano, oQuePlanoInclui } from './oQuePlanoInclui';

const Valor: React.FC<{ valor: string | boolean }> = ({ valor }) => {
  if (valor === true) {
    return (
      <span className="inline-flex items-center text-fg-token">
        <CheckIcon className="h-4 w-4 text-brand-ink" aria-hidden />
        <span className="sr-only">Incluído</span>
      </span>
    );
  }
  if (valor === false) {
    return (
      <span className="inline-flex items-center text-fg-muted-token">
        <XMarkIcon className="h-4 w-4" aria-hidden />
        <span className="sr-only">Não incluído</span>
      </span>
    );
  }
  return <span className="text-sm font-medium text-fg-token">{valor}</span>;
};

export interface CartaoDePlanoProps {
  plano: Plan;
  planoAtual?: string | null;
  temAssinatura?: boolean;
  ocupado?: boolean;
  onEscolher: (plano: Plan) => void;
}

export const CartaoDePlano: React.FC<CartaoDePlanoProps> = ({
  plano, planoAtual, temAssinatura = false, ocupado = false, onEscolher,
}) => {
  const atual = plano.key === planoAtual;
  const acao = acaoDoPlano(plano, planoAtual, temAssinatura);

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 ${
        atual ? 'border-brand ring-1 ring-brand' : 'border-border-token'
      }`}
    >
      {atual && <span className="mb-1 text-xs font-semibold text-brand-ink">Plano atual</span>}
      <h3 className="text-base font-bold text-fg-token">{plano.name}</h3>

      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-fg-token">
          {plano.monthly_price === 0 ? 'Grátis' : formatCurrency(plano.monthly_price)}
        </span>
        {plano.monthly_price > 0 && <span className="text-sm text-fg-muted-token">/mês</span>}
      </p>
      <p className="mt-1 text-xs text-fg-muted-token">
        {plano.setup_fee > 0
          ? `+ ${formatCurrency(plano.setup_fee)} de adesão (única)`
          : 'Sem taxa de adesão'}
      </p>

      <ul className="mt-4 flex-1 space-y-2 border-t border-border-token pt-4">
        {oQuePlanoInclui(plano).map((item) => (
          <li key={item.rotulo} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-fg-muted-token">{item.rotulo}</span>
            <Valor valor={item.valor} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={acao.desabilitado || ocupado}
        onClick={() => onEscolher(plano)}
        className="mt-5 w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {acao.rotulo}
      </button>
    </div>
  );
};

export default CartaoDePlano;
