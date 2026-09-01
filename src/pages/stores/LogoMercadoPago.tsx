import React from 'react';

/**
 * Marca do Mercado Pago para o botão de conectar conta.
 *
 * Inline e não `<img>` de CDN de propósito: o botão de OAuth é a única coisa
 * entre o lojista e o dinheiro dele cair na conta certa. Um asset remoto que
 * some (link rot, bloqueio de rede, adblock) deixaria um botão sem identidade
 * numa hora em que o lojista precisa reconhecer a marca para confiar no clique.
 */
export const LogoMercadoPago: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 28" role="img" aria-label="Mercado Pago" className={className}>
    {/* Cápsula clara: o aperto de mão do MP vive sobre fundo branco. */}
    <ellipse cx="20" cy="14" rx="19.2" ry="12.4" fill="#fff" />
    <ellipse cx="20" cy="14" rx="19.2" ry="12.4" fill="none" stroke="#00A6E0" strokeWidth="1.1" />
    {/* Aperto de mão, simplificado: dois antebraços e as mãos travadas no meio. */}
    <path
      d="M5.6 12.9c2.6-.35 4.6-1.5 6.5-2.8 1.9-1.3 4-1.9 6.1-1.2l4.5 1.6c.75.27.9 1.2.28 1.66-.62.46-1.5.5-2.2.1l-2.5-1.4"
      fill="none" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M34.4 12.9c-2.6-.35-4.7-1.5-6.6-2.8-1.5-1-3.1-1.1-4.6-.55"
      fill="none" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M18.3 10.9l3.6 2.5m-2 1.6l3.1 2.2m-2 1.6l2.5 1.8m-1.9 1.5l1.8 1.3"
      fill="none" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round"
    />
    <path
      d="M27.8 10.1l4.8 3.4c.7.5.85 1.45.34 2.13l-3.5 4.7c-.5.68-1.45.82-2.12.32l-3.3-2.4"
      fill="none" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

export default LogoMercadoPago;
