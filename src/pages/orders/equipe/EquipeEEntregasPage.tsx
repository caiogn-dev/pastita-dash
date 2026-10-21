/**
 * Equipe e entregas — ranking por entregador e por atendente (do Prefiro).
 *
 * Entregador é atribuído no pedido; atendente é quem lançou o pedido no
 * painel. "Sem entregador" vem junto: ranking que ignora metade das entregas
 * premia quem foi anotado, não quem trabalhou.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button, Card, EmptyState, Input, PageShell } from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { getErrorMessage } from '../../../services';
import { operacaoService, type Entregador, type RankingDaOperacao } from '../../../services/operacao';
import { formatCurrency } from '../../../utils/formatters';

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
];

const TH = 'pb-2 px-2 text-xs font-semibold uppercase tracking-wide text-fg-muted-token';
const TD = 'py-2 px-2 text-fg-token tabular-nums';

export const EquipeEEntregasPage: React.FC = () => {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;
  const [dias, setDias] = useState(30);
  const [ranking, setRanking] = useState<RankingDaOperacao | null>(null);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [erro, setErro] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!slug) return;
    try {
      const [r, e] = await Promise.all([operacaoService.ranking(slug, dias), operacaoService.entregadores(slug)]);
      setRanking(r);
      setEntregadores(e);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, [slug, dias]);

  useEffect(() => { void carregar(); }, [carregar]);

  const cadastrar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!slug || !nome.trim()) return;
    setSalvando(true);
    try {
      const novo = await operacaoService.criarEntregador(slug, { nome: nome.trim(), telefone: telefone.trim() });
      setEntregadores((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNome('');
      setTelefone('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (e: Entregador) => {
    if (!slug) return;
    try {
      const mudado = await operacaoService.mudarEntregador(slug, e.id, { is_active: !e.is_active });
      setEntregadores((atual) => atual.map((x) => (x.id === e.id ? mudado : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <PageShell
      titulo="Equipe e entregas"
      filtros={(
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              aria-pressed={dias === p.dias}
              onClick={() => setDias(p.dias)}
              className={`rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
                dias === p.dias
                  ? 'border-transparent bg-brand text-on-brand'
                  : 'border-border-token text-fg-token hover:bg-surface-muted-token'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}
    >
      {erro ? (
        <p role="alert" className="superficie p-4 text-body text-danger-token">
          Não foi possível carregar a equipe agora.
        </p>
      ) : !ranking ? (
        <p className="text-body text-fg-muted-token">Carregando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-fg-token">Entregadores</h2>
            {ranking.entregadores.length === 0 ? (
              <EmptyState
                titulo="Nenhuma entrega atribuída no período"
                descricao="Escolha o entregador no pedido e o ranking aparece aqui."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${TH} text-left`}>Entregador</th>
                    <th className={`${TH} text-right`}>Entregas</th>
                    <th className={`${TH} text-right`}>Na rua</th>
                    <th className={`${TH} text-right`}>Frete</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.entregadores.map((e) => (
                    <tr key={e.id} className="border-t border-border-token">
                      <td className={`${TD} font-medium`}>{e.nome}</td>
                      <td className={`${TD} text-right`}>{e.entregas}</td>
                      <td className={`${TD} text-right`}>{e.minutos_medios == null ? '—' : `${e.minutos_medios} min`}</td>
                      <td className={`${TD} text-right`}>{formatCurrency(e.frete)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ranking.sem_entregador > 0 && (
              <p className="mt-3 text-sm text-fg-muted-token">
                {ranking.sem_entregador} {ranking.sem_entregador === 1 ? 'entrega ficou' : 'entregas ficaram'} sem entregador no período.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-fg-token">Atendentes</h2>
            {ranking.atendentes.length === 0 ? (
              <EmptyState
                titulo="Nenhum pedido lançado no painel no período"
                descricao="Pedido do balcão ou lançado à mão conta para quem o lançou."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${TH} text-left`}>Atendente</th>
                    <th className={`${TH} text-right`}>Pedidos</th>
                    <th className={`${TH} text-right`}>Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.atendentes.map((a) => (
                    <tr key={a.id} className="border-t border-border-token">
                      <td className={`${TD} font-medium`}>{a.nome}</td>
                      <td className={`${TD} text-right`}>{a.pedidos}</td>
                      <td className={`${TD} text-right`}>{formatCurrency(a.faturado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-fg-token">Quem entrega</h2>
            <ul className="mb-4 flex flex-wrap gap-2">
              {entregadores.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={e.is_active}
                    onClick={() => alternar(e)}
                    title={e.is_active ? 'Desligar' : 'Religar'}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      e.is_active ? 'border-border-token text-fg-token' : 'border-dashed border-border-token text-fg-muted-token line-through'
                    }`}
                  >
                    {e.nome}
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={cadastrar} className="flex flex-wrap items-end gap-3">
              <div className="w-56 max-sm:w-full">
                <Input label="Nome" value={nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)} />
              </div>
              <div className="w-44 max-sm:w-full">
                <Input label="Telefone" inputMode="tel" value={telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefone(e.target.value)} />
              </div>
              <Button type="submit" disabled={salvando || !nome.trim()}>Adicionar entregador</Button>
            </form>
          </Card>
        </div>
      )}
    </PageShell>
  );
};

export default EquipeEEntregasPage;
