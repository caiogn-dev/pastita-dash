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

// Marca oficial (simple-icons 13.21, "mercadopago"): aperto de mão na elipse.
const MERCADO_PAGO_PATH = 'M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z';

/** O logo oficial (aperto de mãos na elipse), o mesmo da tela de Recebimento.
 *  Desenhar à mão saía irreconhecível — o dono não reconheceu a marca. */
export const MercadoPagoIcon: React.FC<Props> = ({ size = 40, className }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white ${className ?? ''}`}
    style={{ width: size, height: size }}
    aria-hidden
  >
    <img src="/mercado-pago.webp" alt="" width={Math.round(size * 0.82)} height={Math.round(size * 0.56)} style={{ objectFit: 'contain' }} />
  </span>
);
