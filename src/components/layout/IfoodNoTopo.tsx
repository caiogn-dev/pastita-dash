/**
 * iFood na barra do topo: a loja está aberta no iFood? Pausar e reabrir em
 * 1 clique, de qualquer tela.
 *
 * Pedido do dono (20/11): "vou ter que ir na página de integrações para pausar
 * a loja do iFood?". Integrações é onde se LIGA o iFood; pausar é operação do
 * turno e mora junto da Central de Pedidos.
 *
 * Só aparece em loja com iFood: o GET devolve 400 quando não há ID da loja no
 * iFood — aí o selo some em silêncio (não é erro do operador). Atualiza a cada
 * minuto, e só com a aba visível: cada leitura são 3 chamadas ao iFood.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import api from '../../services/api';
import { getErrorMessage } from '../../services';

interface Pausa { id: string; motivo: string; inicio: string; fim: string }
interface Estado {
  status: { estado: string; aberta: boolean; titulo: string; detalhe: string };
  pausas: Pausa[];
}

const URL = '/stores/integracoes/ifood/loja/';
const ATUALIZA_MS = 60_000;
const PAUSAS = [
  { rotulo: '15 min', minutos: 15 },
  { rotulo: '30 min', minutos: 30 },
  { rotulo: '1 h', minutos: 60 },
  { rotulo: '2 h', minutos: 120 },
];

const hora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const pausasAtivas = (e: Estado) => {
  const agora = Date.now();
  return e.pausas.filter((p) => new Date(p.inicio).getTime() <= agora && new Date(p.fim).getTime() > agora);
};

const leitura = (e: Estado) => {
  const ativas = pausasAtivas(e);
  if (ativas.length) {
    const ate = ativas.reduce((m, p) => (p.fim > m ? p.fim : m), ativas[0].fim);
    return { rotulo: 'Pausada', tom: 'bg-warning-token', ate: hora(ate), ativas };
  }
  if (e.status.aberta) return { rotulo: 'Aberta', tom: 'bg-success-token', ate: '', ativas };
  return { rotulo: 'Fechada', tom: 'bg-danger-token', ate: '', ativas };
};

const botaoPausa =
  'h-9 rounded-lg border border-border-token text-sm font-semibold text-fg-token transition ' +
  'hover:bg-surface-muted-token disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export const IfoodNoTopo: React.FC<{ storeSlug?: string | null }> = ({ storeSlug }) => {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const params = { params: { store: storeSlug } };

  const carregar = useCallback(async () => {
    if (!storeSlug) return;
    try {
      setEstado((await api.get(URL, { params: { store: storeSlug } })).data as Estado);
    } catch {
      setEstado(null); // loja sem iFood (400) ou iFood fora: o selo some
    }
  }, [storeSlug]);

  useEffect(() => {
    setEstado(null);
    if (!storeSlug) return undefined;
    carregar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar(); }, ATUALIZA_MS);
    return () => clearInterval(t);
  }, [storeSlug, carregar]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  if (!storeSlug || !estado) return null;

  const agir = async (chamada: () => Promise<{ data: unknown }>, ok: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      setEstado((await chamada()).data as Estado);
      toast.success(ok);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  };

  const pausar = (minutos: number, rotulo: string) =>
    agir(() => api.post(`${URL}pausar/`, { minutos }, params), `iFood pausado por ${rotulo}`);

  const reabrir = (ativas: Pausa[]) =>
    agir(async () => {
      let ultimo: { data: unknown } = { data: estado };
      for (const p of ativas) ultimo = await api.post(`${URL}retomar/`, { id: p.id }, params);
      return ultimo;
    }, 'iFood reaberto');

  const l = leitura(estado);
  const motivo = l.ativas.length ? '' : estado.status.detalhe;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`iFood: ${l.rotulo}${l.ate ? ` até ${l.ate}` : ''}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-chrome-border px-2 py-1.5 text-sm font-semibold text-chrome-fg transition-colors hover:bg-chrome-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="rounded bg-[#EA1D2C] px-1 text-[10px] font-black italic leading-4 text-white" aria-hidden>iFood</span>
        <span className={`h-1.5 w-1.5 rounded-full ${l.tom}`} aria-hidden />
        <span className="max-md:sr-only" aria-hidden>{l.rotulo}{l.ate && ` até ${l.ate}`}</span>
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Loja no iFood"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border-token bg-surface-token p-4 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${l.tom}`} aria-hidden />
            <p className="flex-1 text-sm font-bold text-fg-token">
              {l.rotulo === 'Pausada' ? `Pausada até ${l.ate}` : `Loja ${l.rotulo.toLowerCase()} no iFood`}
            </p>
          </div>
          {motivo && <p className="mt-1 text-xs text-fg-muted-token">{motivo}</p>}

          {l.ativas.length > 0 ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => reabrir(l.ativas)}
              className="mt-4 h-10 w-full rounded-lg bg-brand text-sm font-bold text-on-brand transition hover:bg-brand-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Reabrir agora
            </button>
          ) : (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-fg-muted-token">Pausar</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {PAUSAS.map(({ rotulo, minutos }) => (
                  <button key={minutos} type="button" disabled={ocupado} onClick={() => pausar(minutos, rotulo)} className={botaoPausa}>
                    {rotulo}
                  </button>
                ))}
              </div>
            </>
          )}

          <Link
            to="/connections"
            onClick={() => setAberto(false)}
            className="mt-4 block text-center text-xs font-semibold text-fg-muted-token underline-offset-2 hover:text-fg-token hover:underline"
          >
            Horários
          </Link>
        </div>
      )}
    </div>
  );
};

export default IfoodNoTopo;
