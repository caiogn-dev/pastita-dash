import React from 'react';

/** Marca da 99Food: o quadrado amarelo com "99". Quem olha o quadro cheio
 * precisa separar o pedido da 99 sem ler — o entregador dela chega falando
 * "pedido 16", não o nosso número. */
export const AMARELO_99 = '#FFD400';

type Props = { numero?: number | null; tamanho?: 'sm' | 'md' | 'lg'; className?: string };

const LADO = { sm: 16, md: 22, lg: 44 } as const;
const TEXTO = { sm: 'text-badge', md: 'text-caption', lg: 'text-lg' } as const;

export const Marca99: React.FC<Props> = ({ numero, tamanho = 'sm', className = '' }) => {
  const lado = LADO[tamanho];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <svg width={lado} height={lado} viewBox="0 0 24 24" role="img" aria-label="99Food" className="shrink-0">
        <rect width="24" height="24" rx="6" fill={AMARELO_99} />
        <text
          x="12" y="16.6" textAnchor="middle" fontSize="12.5" fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif" fill="#111" letterSpacing="-0.6"
        >
          99
        </text>
      </svg>
      {numero ? <span className={`font-mono font-bold text-fg-token ${TEXTO[tamanho]}`}>#{numero}</span> : null}
    </span>
  );
};
