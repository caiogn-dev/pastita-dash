/**
 * O lugar de um recurso pago que a loja ainda não contratou.
 *
 * Não é erro: o recurso existe, só não está no plano dela. Então a tela diz
 * isso em uma frase e oferece o mesmo cartão da Assinatura, com o botão de
 * contratar ali mesmo — quem esbarrou no bloqueio já está convencido de que
 * quer usar.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';

import type { UseAdicional } from '../../hooks/useAdicional';
import { CartaoDeAdicional } from './CartaoDeAdicional';

export interface AdicionalBloqueadoProps {
  etiqueta: UseAdicional;
  className?: string;
}

export const AdicionalBloqueado: React.FC<AdicionalBloqueadoProps> = ({ etiqueta, className }) => (
  <section className={`space-y-4 ${className ?? ''}`}>
    <div className="flex items-start gap-3">
      <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-fg-token">
          Receitas e etiqueta nutricional fazem parte do adicional Etiqueta ANVISA.
        </p>
        <p className="mt-1 text-sm text-fg-muted-token">
          Contrate e a tela libera na hora; o valor entra na próxima fatura.{' '}
          <Link to="/assinatura" className="font-medium text-brand-ink underline underline-offset-2">
            Ver assinatura
          </Link>
        </p>
      </div>
    </div>
    {etiqueta.adicional && (
      <div className="max-w-md">
        <CartaoDeAdicional
          adicional={etiqueta.adicional}
          estado={etiqueta.estado}
          ocupado={etiqueta.ocupado}
          erro={etiqueta.erro}
          onContratar={() => void etiqueta.contratar()}
          onCancelar={() => void etiqueta.cancelar()}
        />
      </div>
    )}
  </section>
);

export default AdicionalBloqueado;
