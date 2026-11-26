/**
 * "Loja no iFood" (módulo Merchant): se a loja está aberta no iFood, pausas e
 * horários de funcionamento. Só aparece com a loja conectada — o cartão do
 * iFood decide. Leitura e escrita em `/stores/integracoes/ifood/loja/`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

import api from '../../services/api';
import { getErrorMessage } from '../../services';
import { Input } from '../../components/ui/input';
import { Selo, botaoPrimario } from './pecasDeIntegracao';

type Dia = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

interface Horario { dia: Dia; inicio: string; fim: string }
interface Pausa { id: string; motivo: string; inicio: string; fim: string }

export interface EstadoDaLojaNoIfood {
  status: { estado: 'OK' | 'WARNING' | 'CLOSED' | 'ERROR' | ''; aberta: boolean; titulo: string; detalhe: string };
  pausas: Pausa[];
  horarios: Horario[];
}

type Turno = { inicio: string; fim: string };
type Grade = Record<Dia, Turno[]>;

const DIAS: { dia: Dia; nome: string; no?: true }[] = [
  { dia: 'MONDAY', nome: 'Segunda' },
  { dia: 'TUESDAY', nome: 'Terça' },
  { dia: 'WEDNESDAY', nome: 'Quarta' },
  { dia: 'THURSDAY', nome: 'Quinta' },
  { dia: 'FRIDAY', nome: 'Sexta' },
  { dia: 'SATURDAY', nome: 'Sábado', no: true },
  { dia: 'SUNDAY', nome: 'Domingo', no: true },
];

const PAUSAS = [
  { rotulo: '15 min', minutos: 15 },
  { rotulo: '30 min', minutos: 30 },
  { rotulo: '1 h', minutos: 60 },
  { rotulo: '2 h', minutos: 120 },
];

const paraGrade = (horarios: Horario[]): Grade => {
  const grade = Object.fromEntries(DIAS.map(({ dia }) => [dia, [] as Turno[]])) as Grade;
  horarios.forEach(({ dia, inicio, fim }) => { grade[dia]?.push({ inicio, fim }); });
  return grade;
};

/** Ordem fixa (seg..dom, turno a turno): também serve para comparar com o salvo. */
const paraLista = (grade: Grade): Horario[] =>
  DIAS.flatMap(({ dia }) => grade[dia].map(({ inicio, fim }) => ({ dia, inicio, fim })));

const turnoValido = ({ inicio, fim }: Turno) => !!inicio && !!fim && fim > inicio;

const hora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const seloDoStatus = (status: EstadoDaLojaNoIfood['status']) => {
  if (status.aberta) return <Selo tom="ok">Aberta</Selo>;
  if (status.estado === 'WARNING') return <Selo tom="breve">Atenção</Selo>;
  return <Selo tom="perigo">Fechada</Selo>;
};

const botaoPequeno =
  'inline-flex h-9 items-center justify-center rounded-lg border border-border-token px-3 text-xs font-semibold text-fg-token transition hover:bg-surface-muted-token disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const botaoIcone =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted-token transition hover:bg-surface-muted-token hover:text-fg-token disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export const LojaNoIfood: React.FC<{ storeId: string }> = ({ storeId }) => {
  const [estado, setEstado] = useState<EstadoDaLojaNoIfood | null>(null);
  const [grade, setGrade] = useState<Grade>(() => paraGrade([]));
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [conferir, setConferir] = useState(false);

  const params = { params: { store: storeId } };

  const aplicar = (novo: EstadoDaLojaNoIfood) => {
    setEstado(novo);
    setGrade(paraGrade(novo.horarios ?? []));
    setConferir(false);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.get('/stores/integracoes/ifood/loja/', { params: { store: storeId } });
      aplicar(r.data as EstadoDaLojaNoIfood);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [storeId]);

  useEffect(() => { carregar(); }, [carregar]);

  const executar = async (acao: () => Promise<{ data: unknown }>, sucesso?: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      aplicar((await acao()).data as EstadoDaLojaNoIfood);
      if (sucesso) toast.success(sucesso);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  };

  const pausar = (minutos: number) =>
    executar(() => api.post('/stores/integracoes/ifood/loja/pausar/', { minutos }, params));
  const retomar = (id: string) =>
    executar(() => api.post('/stores/integracoes/ifood/loja/retomar/', { id }, params));

  const mudarTurno = (dia: Dia, i: number, campo: keyof Turno, valor: string) =>
    setGrade((g) => ({ ...g, [dia]: g[dia].map((t, j) => (j === i ? { ...t, [campo]: valor } : t)) }));
  const adicionarTurno = (dia: Dia) =>
    setGrade((g) => ({ ...g, [dia]: [...g[dia], { inicio: '', fim: '' }] }));
  const removerTurno = (dia: Dia, i: number) =>
    setGrade((g) => ({ ...g, [dia]: g[dia].filter((_, j) => j !== i) }));

  const salvos = estado ? JSON.stringify(paraLista(paraGrade(estado.horarios ?? []))) : '';
  const mudou = !!estado && JSON.stringify(paraLista(grade)) !== salvos;

  const salvarHorarios = () => {
    const invalido = DIAS.find(({ dia }) => grade[dia].some((t) => !turnoValido(t)));
    if (invalido) {
      setConferir(true);
      toast.error(`${invalido.nome}: o fim precisa ser depois do início`);
      return;
    }
    executar(
      () => api.put('/stores/integracoes/ifood/loja/horarios/', { horarios: paraLista(grade) }, params),
      'Horários salvos',
    );
  };

  return (
    <section aria-labelledby={`loja-ifood-${storeId}`} className="flex flex-col gap-4 border-t border-border-token pt-5">
      <header className="flex items-center gap-2">
        <h3 id={`loja-ifood-${storeId}`} className="flex-1 text-sm font-bold text-fg-token">Loja no iFood</h3>
        {estado && seloDoStatus(estado.status)}
        <button
          type="button"
          onClick={carregar}
          disabled={carregando}
          className={botaoIcone}
          aria-label="Atualizar"
          title="Atualizar"
        >
          <ArrowPathIcon className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </header>

      {!estado && carregando && <p role="status" className="text-sm text-fg-muted-token">Carregando…</p>}

      {estado && (
        <>
          {!estado.status.aberta && (estado.status.titulo || estado.status.detalhe) && (
            <div className="flex flex-col text-sm">
              {estado.status.titulo && <span className="font-semibold text-fg-token">{estado.status.titulo}</span>}
              {estado.status.detalhe && <span className="text-fg-muted-token">{estado.status.detalhe}</span>}
            </div>
          )}

          <div role="group" aria-label="Pausar" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-fg-token">Pausar</span>
            {PAUSAS.map(({ rotulo, minutos }) => (
              <button key={minutos} type="button" onClick={() => pausar(minutos)} disabled={ocupado} className={botaoPequeno}>
                {rotulo}
              </button>
            ))}
          </div>

          {estado.pausas.length > 0 && (
            <ul aria-label="Pausas" className="flex flex-col gap-2">
              {estado.pausas.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted-token px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 text-fg-token">
                    {p.motivo && <span className="font-semibold">{p.motivo}</span>}
                    {hora(p.fim) && <span className="text-fg-muted-token">{p.motivo ? ' · ' : ''}até {hora(p.fim)}</span>}
                  </span>
                  <button type="button" onClick={() => retomar(p.id)} disabled={ocupado} className={botaoPequeno}>
                    Retomar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-fg-token">Horários</h4>
            <ul className="flex flex-col divide-y divide-border-token">
              {DIAS.map(({ dia, nome, no }) => (
                <li key={dia} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-2">
                  <span className="w-20 shrink-0 pt-2 text-sm font-medium text-fg-token">{nome}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {grade[dia].length === 0 && <span className="pt-2 text-sm text-fg-muted-token">Fechado</span>}
                    {grade[dia].map((t, i) => {
                      const rotulo = `${nome}, turno ${i + 1}`;
                      const ruim = conferir && !turnoValido(t);
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <Input
                            size="sm"
                            type="time"
                            value={t.inicio}
                            onChange={(e) => mudarTurno(dia, i, 'inicio', e.target.value)}
                            aria-label={`${rotulo}, início`}
                            aria-invalid={ruim || undefined}
                            error={ruim ? ' ' : undefined}
                            className="w-28"
                          />
                          <span aria-hidden className="text-fg-muted-token">–</span>
                          <Input
                            size="sm"
                            type="time"
                            value={t.fim}
                            onChange={(e) => mudarTurno(dia, i, 'fim', e.target.value)}
                            aria-label={`${rotulo}, fim`}
                            aria-invalid={ruim || undefined}
                            error={ruim ? ' ' : undefined}
                            className="w-28"
                          />
                          <button
                            type="button"
                            onClick={() => removerTurno(dia, i)}
                            className={botaoIcone}
                            aria-label={`Remover ${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`}
                            title="Remover turno"
                          >
                            <XMarkIcon className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => adicionarTurno(dia)}
                    className={botaoIcone}
                    aria-label={`Adicionar turno ${no ? 'no' : 'na'} ${nome.toLowerCase()}`}
                    title="Adicionar turno"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button
                type="button"
                onClick={salvarHorarios}
                disabled={ocupado || !mudou}
                className={botaoPrimario}
              >
                Salvar horários
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default LojaNoIfood;
