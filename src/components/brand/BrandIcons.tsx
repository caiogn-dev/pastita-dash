/**
 * Ícones das marcas que a loja conecta (WhatsApp, Instagram, Facebook).
 *
 * SVG próprio, sem dependência nem imagem remota: o lojista reconhece o canal
 * pelo ícone antes de ler o nome. Decorativos por padrão (`aria-hidden`) — o
 * nome do canal sempre vem escrito ao lado.
 */
import React, { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
}

export const WhatsAppIcon: React.FC<Props> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden focusable="false">
    <rect width="44" height="44" rx="12" fill="#25D366" />
    <path
      d="M22 10.5a11.4 11.4 0 0 0-9.8 17.2L10.6 33.5l6-1.6A11.4 11.4 0 1 0 22 10.5z"
      fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round"
    />
    <path
      d="M17.6 17.2c.3-.7.6-.7 1-.7h.8c.2 0 .5.1.7.6l1 2.3c.1.3 0 .6-.2.8l-.8.9c-.2.2-.2.4 0 .7.7 1.2 1.9 2.4 3.3 3.1.3.2.5.1.7-.1l.9-1.1c.2-.3.5-.3.8-.2l2.2 1.1c.4.2.5.4.5.6 0 .6-.3 1.6-1.4 2.1-1 .5-2.6.5-4.6-.5-2.2-1.1-4-3.3-4.8-4.9-.8-1.6-.6-3.1-.1-3.9z"
      fill="#FFFFFF"
    />
  </svg>
);

export const InstagramIcon: React.FC<Props> = ({ size = 40, className }) => {
  // id único: dois ícones na mesma tela não podem disputar o mesmo gradiente.
  const gradiente = `ig-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradiente} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.6" stopColor="#D62976" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect width="44" height="44" rx="12" fill={`url(#${gradiente})`} />
      <rect x="11" y="11" width="22" height="22" rx="7" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
      <circle cx="22" cy="22" r="5.2" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
      <circle cx="28.4" cy="15.6" r="1.6" fill="#FFFFFF" />
    </svg>
  );
};

/** Só o "f", para ir dentro do botão azul do Facebook. */
export const FacebookMark: React.FC<Props> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <path
      d="M13.4 21v-7.6h2.5l.4-3h-2.9V8.6c0-.9.3-1.4 1.5-1.4h1.5V4.6a20 20 0 0 0-2.3-.1c-2.2 0-3.7 1.3-3.7 3.9v2.1H8v3h2.5V21z"
      fill="currentColor"
    />
  </svg>
);

/* Apps de delivery e pagamento — mesmo quadrado de 44 com canto 12, para os
 * cartões da aba Integrações ficarem alinhados com WhatsApp e Instagram. As
 * cores são as de `COR_DO_APP` (MarcaDoApp), as do quadro de pedidos. */
const FONTE = 'Arial, Helvetica, sans-serif';

export const NinetyNineFoodIcon: React.FC<Props> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden focusable="false">
    <rect width="44" height="44" rx="12" fill="#FFD400" />
    <text x="22" y="27.5" textAnchor="middle" fontSize="19" fontWeight="900" fontFamily={FONTE} fill="#111" letterSpacing="-1">99</text>
    <text x="22" y="36" textAnchor="middle" fontSize="6.4" fontWeight="800" fontFamily={FONTE} fill="#111" letterSpacing="0.6">FOOD</text>
  </svg>
);

export const IfoodIcon: React.FC<Props> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden focusable="false">
    <rect width="44" height="44" rx="12" fill="#EA1D2C" />
    <text x="22" y="26.5" textAnchor="middle" fontSize="13" fontWeight="900" fontStyle="italic" fontFamily={FONTE} fill="#fff" letterSpacing="-0.5">iFood</text>
  </svg>
);

export const MercadoPagoIcon: React.FC<Props> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" className={className} aria-hidden focusable="false">
    <rect width="44" height="44" rx="12" fill="#00B1EA" />
    <ellipse cx="22" cy="22" rx="14" ry="9.5" fill="#fff" />
    <path d="M12.5 21.5l4.2-2.6 3.6 2.4 3.4-2.4 3.4 2.4 3.6-2.4 4.2 2.6" fill="none" stroke="#00B1EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.8 24.2l2.6 2.1M20.4 23.6l2.8 2.4M24.2 23.4l2.4 2.2" stroke="#00B1EA" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
