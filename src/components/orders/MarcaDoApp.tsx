import React from 'react';
import type { AppDeEntrega } from '../../pages/orders/pedidoDeApp';

/** Marca do app de entrega. Quem olha o quadro cheio precisa separar o pedido
 * de app sem ler — o entregador chega falando "pedido 16", não o nosso número. */
export const COR_DO_APP: Record<AppDeEntrega, string> = {
  '99food': '#FFD400',
  ifood: '#EA1D2C',
};

const NOME: Record<AppDeEntrega, string> = { '99food': '99Food', ifood: 'iFood' };

type Props = { app: AppDeEntrega; numero?: number | null; tamanho?: 'sm' | 'md' | 'lg'; className?: string };

const LADO = { sm: 16, md: 22, lg: 44 } as const;
const TEXTO = { sm: 'text-badge', md: 'text-caption', lg: 'text-lg' } as const;

const Simbolo: React.FC<{ app: AppDeEntrega }> = ({ app }) =>
  app === '99food' ? (
    <text x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="900"
      fontFamily="Arial, Helvetica, sans-serif" fill="#111" letterSpacing="-0.6">99</text>
  ) : (
    <text x="12" y="14.6" textAnchor="middle" fontSize="7.6" fontWeight="900" fontStyle="italic"
      fontFamily="Arial, Helvetica, sans-serif" fill="#fff" letterSpacing="-0.3">iFood</text>
  );

export const MarcaDoApp: React.FC<Props> = ({ app, numero, tamanho = 'sm', className = '' }) => {
  const lado = LADO[tamanho];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <svg width={lado} height={lado} viewBox="0 0 24 24" role="img" aria-label={NOME[app]} className="shrink-0">
        <rect width="24" height="24" rx="6" fill={COR_DO_APP[app]} />
        <Simbolo app={app} />
      </svg>
      {numero ? <span className={`font-mono font-bold text-fg-token ${TEXTO[tamanho]}`}>#{numero}</span> : null}
    </span>
  );
};
