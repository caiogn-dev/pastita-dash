/**
 * Configurações → Minhas marcas: o dono escolhe quais lojas dele aparecem
 * juntas na faixa de marcas do cardápio, em que ordem e com que link.
 * Backend: GET/PUT /stores/minhas-marcas/ (só o dono edita).
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

import api from '../../services/api';
import { getErrorMessage } from '../../services';
import { useStore } from '../../hooks';
import { Button, EmptyState, Input, PageShell } from '../../components/ui';
import { Switch } from '../../components/common/Switch';
import { cn } from '../../utils/cn';

export interface Marca { slug: string; nome: string; logo_url: string; no_grupo: boolean; link: string }

const URL = '/stores/minhas-marcas/';

export const MinhasMarcasPage: React.FC = () => {
  const { store } = useStore();
  const slug = store?.slug || '';
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setMarcas(null); setErro('');
    api.get(URL, { params: { store: slug } })
      .then((r) => setMarcas(r.data.marcas as Marca[]))
      .catch((e) => setErro(getErrorMessage(e)));
  }, [slug]);

  const mudar = (lista: Marca[]) => { setMarcas(lista); setSujo(true); };
  const alternar = (i: number) => mudar(marcas!.map((m, j) => (j === i ? { ...m, no_grupo: !m.no_grupo } : m)));
  const mover = (i: number, d: -1 | 1) => {
    const l = [...marcas!]; [l[i], l[i + d]] = [l[i + d], l[i]]; mudar(l);
  };
  const link = (i: number, v: string) => mudar(marcas!.map((m, j) => (j === i ? { ...m, link: v } : m)));

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await api.put(URL, { marcas: marcas!.map(({ slug: s, no_grupo, link: l }) => ({ slug: s, no_grupo, link: l })) }, { params: { store: slug } });
      setMarcas(r.data.marcas as Marca[]); setSujo(false);
      toast.success('Marcas salvas');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const noGrupo = (marcas || []).filter((m) => m.no_grupo).length;

  return (
    <PageShell
      titulo="Minhas marcas"
      acoes={marcas && marcas.length > 1 ? (
        <Button onClick={salvar} disabled={!sujo || salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
      ) : undefined}
    >
      {erro && <EmptyState titulo="Não deu para carregar" descricao={erro} />}
      {!erro && !marcas && <p className="text-sm text-fg-muted-token">Carregando…</p>}
      {marcas && marcas.length <= 1 && <EmptyState titulo="Você tem uma loja só" />}
      {marcas && marcas.length > 1 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Marcas">
          {marcas.map((m, i) => (
            <li
              key={m.slug}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-surface-token p-4 transition',
                m.no_grupo ? 'border-brand shadow-sm' : 'border-border-token opacity-70',
              )}
            >
              <div className="flex items-center gap-3">
                {m.logo_url
                  ? <img src={m.logo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-border-token" />
                  : <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted-token text-lg font-bold text-fg-token" aria-hidden>{m.nome.slice(0, 1)}</span>}
                <p className="min-w-0 flex-1 truncate font-semibold text-fg-token">{m.nome}</p>
                <Switch checked={m.no_grupo} onChange={() => alternar(i)} ariaLabel={`Mostrar ${m.nome}`} />
              </div>
              {m.no_grupo && (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      type="url"
                      value={m.link}
                      onChange={(e) => link(i, e.target.value)}
                      placeholder="Link externo (opcional)"
                      aria-label={`Link de ${m.nome}`}
                      size="sm"
                    />
                  </div>
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${m.nome}`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border-token text-fg-token hover:bg-surface-muted-token disabled:opacity-30">
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === marcas.length - 1} aria-label={`Descer ${m.nome}`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border-token text-fg-token hover:bg-surface-muted-token disabled:opacity-30">
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {marcas && marcas.length > 1 && noGrupo === 1 && (
        <p className="mt-3 text-xs text-fg-muted-token">Ligue pelo menos 2 marcas.</p>
      )}
    </PageShell>
  );
};

export default MinhasMarcasPage;
