/**
 * Ícones do painel de propriedades da vitrine (20×20, traço na cor do texto).
 * Desenham o resultado de cada opção — foto em cima/ao lado, logo redondo —
 * no tamanho de um ícone, como os controles de layout do Figma/Framer.
 */
import React from 'react';

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const FotoEmCima = () => (
  <Svg>
    <rect x="3.5" y="2.5" width="13" height="15" rx="2" />
    <rect x="3.5" y="2.5" width="13" height="7.5" rx="2" fill="currentColor" stroke="none" />
    <path d="M6 13h8M6 15.5h5" />
  </Svg>
);

export const FotoAEsquerda = () => (
  <Svg>
    <rect x="2.5" y="4" width="15" height="12" rx="2" />
    <rect x="4.5" y="6.5" width="5" height="7" rx="1" fill="currentColor" stroke="none" />
    <path d="M11.5 8h4M11.5 11h3" />
  </Svg>
);

export const FotoADireita = () => (
  <Svg>
    <rect x="2.5" y="4" width="15" height="12" rx="2" />
    <rect x="10.5" y="6.5" width="5" height="7" rx="1" fill="currentColor" stroke="none" />
    <path d="M4.5 8h4M4.5 11h3" />
  </Svg>
);

export const LogoRedondo = () => (
  <Svg><circle cx="10" cy="10" r="6.5" fill="currentColor" stroke="none" /></Svg>
);

export const LogoQuadrado = () => (
  <Svg><rect x="3.5" y="3.5" width="13" height="13" rx="3" fill="currentColor" stroke="none" /></Svg>
);

export const LogoAoLado = () => (
  <Svg>
    <circle cx="5.5" cy="10" r="3" fill="currentColor" stroke="none" />
    <path d="M10.5 8.5h6.5M10.5 11.5h4.5" />
  </Svg>
);

export const LogoNoCentro = () => (
  <Svg>
    <circle cx="10" cy="6" r="3" fill="currentColor" stroke="none" />
    <path d="M5.5 12h9M7 15h6" />
  </Svg>
);
