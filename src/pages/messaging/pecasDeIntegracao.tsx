/**
 * Peças visuais da aba Integrações. Todo cartão tem a mesma anatomia: marca,
 * nome, estado numa linha, ações embaixo. Configuração pesada (ID da loja,
 * pausas, horários) mora numa gaveta — o cartão mostra o estado, não o form.
 *
 * Busca + filtros (20/11, referência Prefiro): cada cartão declara a categoria
 * e se está ativo; o filtro da página esconde o que não casa, e o grupo some
 * quando fica sem cartão.
 */
import React, { createContext, useContext } from 'react';

export type Tom = 'ok' | 'perigo' | 'neutro' | 'breve';
export type Categoria = 'atendimento' | 'delivery' | 'pagamento';
export type Filtro = 'todas' | 'ativas' | 'desligadas' | Categoria;

const TOM: Record<Tom, { classe: string; ponto: string }> = {
  ok: { classe: 'bg-success-soft text-success-token', ponto: 'bg-success-token' },
  perigo: { classe: 'bg-danger-soft text-danger-token', ponto: 'bg-danger-token' },
  neutro: { classe: 'bg-surface-muted-token text-fg-muted-token', ponto: 'bg-fg-muted-token' },
  breve: { classe: 'bg-warning-soft text-fg-token', ponto: 'bg-warning-token' },
};

export const FiltroDasIntegracoes = createContext<{ filtro: Filtro; busca: string }>({ filtro: 'todas', busca: '' });

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const casaComFiltro = (filtro: Filtro, busca: string, titulo: string, categoria?: Categoria, ativo?: boolean) => {
  if (busca.trim() && !normalizar(titulo).includes(normalizar(busca.trim()))) return false;
  if (filtro === 'todas') return true;
  if (filtro === 'ativas') return !!ativo;
  if (filtro === 'desligadas') return !ativo;
  return categoria === filtro;
};

export const Selo: React.FC<{ tom: Tom; children: React.ReactNode }> = ({ tom, children }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TOM[tom].classe}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${TOM[tom].ponto}`} aria-hidden />
    {children}
  </span>
);

export const Cartao: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  selo?: React.ReactNode;
  categoria?: Categoria;
  ativo?: boolean;
  children?: React.ReactNode;
}> = ({ icone, titulo, subtitulo, selo, categoria, ativo, children }) => {
  const { filtro, busca } = useContext(FiltroDasIntegracoes);
  if (!casaComFiltro(filtro, busca, titulo, categoria, ativo)) return null;
  return (
    <section className="flex flex-col gap-4 superficie p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl [&>svg]:h-11 [&>svg]:w-11">{icone}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight text-fg-token">{titulo}</h2>
          <p className="mt-0.5 truncate text-sm text-fg-muted-token">{subtitulo}</p>
        </div>
        {selo}
      </header>
      {children}
    </section>
  );
};

/** Título de grupo: "Atendimento", "Delivery", "Pagamento". Some sem cartão. */
export const Grupo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="flex flex-col gap-3 [&:not(:has(section))]:hidden">
    <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted-token">{titulo}</h2>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
  </div>
);

export const Acoes: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-token pt-4">{children}</div>
);

export const botaoSecundario =
  'inline-flex h-9 items-center rounded-lg border border-border-token px-3 text-sm font-semibold text-fg-token hover:bg-surface-muted-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
export const botaoPrimario =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand';
export const botaoDiscreto =
  'inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-fg-muted-token hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
