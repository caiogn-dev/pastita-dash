/**
 * Um adicional da assinatura — o mesmo cartão na tela de Assinatura e no
 * lugar onde o recurso está bloqueado. Quem esbarra no bloqueio decide com a
 * mesma informação de quem abriu a Assinatura.
 */
import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { formatCurrency } from '../../utils/formatters';
import type { Adicional } from '../../services/billing';
import type { EstadoDoAdicional } from '../../hooks/useAdicional';

export interface CartaoDeAdicionalProps {
  adicional: Adicional;
  estado: EstadoDoAdicional;
  ocupado?: boolean;
  erro?: string | null;
  onContratar: () => void;
  onCancelar: () => void;
}

export const CartaoDeAdicional: React.FC<CartaoDeAdicionalProps> = ({
  adicional, estado, ocupado = false, erro, onContratar, onCancelar,
}) => {
  const selo = estado === 'contratado' ? 'Contratado' : estado === 'incluso' ? 'Incluso na sua loja' : null;

  return (
    <div
      className={`superficie relative flex h-full flex-col rounded-2xl border p-5 ${
        selo ? 'border-brand ring-1 ring-brand' : 'border-border-token'
      }`}
    >
      {selo && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2 py-0.5 text-badge font-semibold text-on-brand">
          {selo}
        </span>
      )}
      <p className="overline">Adicional</p>
      <h3 className="mt-1 text-base font-bold text-fg-token">{adicional.nome}</h3>

      {estado !== 'incluso' && (
        <>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-fg-token">{formatCurrency(adicional.mensal)}</span>
            <span className="text-sm text-fg-muted-token">/mês</span>
          </p>
          {/* A implantação aparece junto do preço, sem rodeio — igual aos planos. */}
          <p className="mt-1 text-xs text-fg-muted-token">
            + {formatCurrency(adicional.implantacao)} de implantação, uma vez, na próxima fatura.
            No plano anual a implantação sai de graça e o adicional custa{' '}
            {formatCurrency(adicional.anual)} por ano.
          </p>
        </>
      )}
      <p className="mt-3 text-sm text-fg-muted-token">{adicional.descricao}</p>

      <ul className="mt-4 flex-1 space-y-2 border-t border-border-token pt-4">
        {adicional.inclui.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-fg-token">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-danger-token">{erro}</p>
      )}

      {estado === 'contratado' && (
        <button
          type="button"
          disabled={ocupado}
          onClick={onCancelar}
          className="mt-5 w-full rounded-xl border border-border-token px-3 py-2 text-sm font-medium text-fg-muted-token transition-colors hover:text-fg-token disabled:opacity-50"
        >
          Cancelar adicional
        </button>
      )}
      {(estado === 'disponivel' || estado === 'desconhecido') && (
        <button
          type="button"
          disabled={ocupado}
          onClick={onContratar}
          className="mt-5 w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {ocupado ? 'Contratando…' : 'Contratar adicional'}
        </button>
      )}
    </div>
  );
};

export default CartaoDeAdicional;
