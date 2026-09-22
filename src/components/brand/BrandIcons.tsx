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
