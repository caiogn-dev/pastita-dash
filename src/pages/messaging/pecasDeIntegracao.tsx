/**
 * Peças visuais da aba Integrações, compartilhadas entre os canais de
 * atendimento (WhatsApp, Instagram) e os da loja (delivery, pagamento): todo
 * cartão tem a mesma anatomia — marca, nome, selo de estado, ações embaixo.
 */
import React from 'react';

export type Tom = 'ok' | 'perigo' | 'neutro' | 'breve';

const TOM: Record<Tom, { classe: string; ponto: string }> = {
  ok: { classe: 'bg-success-soft text-success-token', ponto: 'bg-success-token' },
  perigo: { classe: 'bg-danger-soft text-danger-token', ponto: 'bg-danger-token' },
  neutro: { classe: 'bg-surface-muted-token text-fg-muted-token', ponto: 'bg-fg-muted-token' },
  breve: { classe: 'bg-warning-soft text-fg-token', ponto: 'bg-warning-token' },
};

export const Selo: React.FC<{ tom: Tom; children: React.ReactNode }> = ({ tom, children }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TOM[tom].classe}`}>
    <span className={`h-2 w-2 rounded-full ${TOM[tom].ponto}`} aria-hidden />
    {children}
  </span>
);

export const Beneficio: React.FC<{ titulo: string; children?: React.ReactNode }> = ({ titulo, children }) => (
  <li className="flex gap-3 text-sm leading-relaxed text-fg-token">
    <svg width="20" height="20" viewBox="0 0 24 24" className="mt-0.5 shrink-0 text-success-token" aria-hidden>
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span><strong className="font-semibold">{titulo}</strong> {children}</span>
  </li>
);

export const Cartao: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  selo?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icone, titulo, subtitulo, selo, children }) => (
  <section className="flex flex-col gap-5 superficie p-6 transition-shadow hover:shadow-md">
    <header className="flex items-center gap-3.5">
      {icone}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-fg-token">{titulo}</h2>
        <p className="truncate text-sm text-fg-muted-token">{subtitulo}</p>
      </div>
      {selo}
    </header>
    {children}
  </section>
);

/** Título de grupo: "Atendimento", "Delivery", "Pagamento". */
export const Grupo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="flex flex-col gap-3">
    <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted-token">{titulo}</h2>
    <div className="grid gap-5 lg:grid-cols-2">{children}</div>
  </div>
);

export const botaoSecundario =
  'inline-flex h-11 items-center superficie px-4 text-sm font-semibold text-fg-token hover:bg-surface-muted-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
export const botaoPrimario =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand';
export const botaoDiscreto =
  'inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-fg-muted-token hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
