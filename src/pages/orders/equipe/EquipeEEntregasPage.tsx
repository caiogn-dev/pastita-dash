/**
 * Equipe e entregas — ranking por entregador e por atendente (do Prefiro).
 *
 * Entregador é atribuído no pedido; atendente é quem lançou o pedido no
 * painel. "Sem entregador" vem junto: ranking que ignora metade das entregas
 * premia quem foi anotado, não quem trabalhou.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { Button, Card, EmptyState, Input, PageShell, Switch, Tabela } from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { getErrorMessage } from '../../../services';
import { operacaoService, type Entregador, type RankingDaOperacao } from '../../../services/operacao';
import { formatCurrency } from '../../../utils/formatters';

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
];


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
              <Tabela
                itens={ranking.entregadores}
                chave={(e) => String(e.id)}
                rotuloDaLinha={(e) => e.nome}
                colunas={[
                  { chave: 'nome', cabecalho: 'Entregador', render: (e) => <span className="font-medium">{e.nome}</span> },
                  { chave: 'entregas', cabecalho: 'Entregas', alinhamento: 'direita', render: (e) => e.entregas },
                  { chave: 'rua', cabecalho: 'Tempo de entrega', alinhamento: 'direita', render: (e) => (e.minutos_medios == null ? '—' : `${e.minutos_medios} min`) },
                  { chave: 'frete', cabecalho: 'Frete', alinhamento: 'direita', render: (e) => formatCurrency(e.frete) },
                ]}
              />
            )}
            {ranking.sem_entregador > 0 && (
              <p className="mt-3 text-sm text-fg-muted-token">
                {ranking.sem_entregador} {ranking.sem_entregador === 1 ? 'entrega ficou' : 'entregas ficaram'} sem entregador no período.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg-token">Atendentes</h2>
              {/* Incluir e remover quem tem login mora em Colaboradores. */}
              <Link to="/colaboradores" className="text-sm font-medium text-fg-token underline-offset-2 hover:underline">
                Gerenciar equipe
              </Link>
            </div>
            {ranking.atendentes.length === 0 ? (
              <EmptyState
                titulo="Nenhum pedido lançado no painel no período"
                descricao="Pedido do balcão ou lançado à mão conta para quem o lançou."
              />
            ) : (
              <Tabela
                itens={ranking.atendentes}
                chave={(a) => String(a.id)}
                rotuloDaLinha={(a) => a.nome}
                colunas={[
                  { chave: 'nome', cabecalho: 'Atendente', render: (a) => <span className="font-medium">{a.nome}</span> },
                  { chave: 'pedidos', cabecalho: 'Pedidos', alinhamento: 'direita', render: (a) => a.pedidos },
                  { chave: 'vendido', cabecalho: 'Vendido', alinhamento: 'direita', render: (a) => formatCurrency(a.faturado) },
                ]}
              />
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-fg-token">Quem entrega</h2>
            {entregadores.length > 0 && (
              <div className="mb-4">
                <Tabela
                  itens={entregadores}
                  chave={(e) => e.id}
                  rotuloDaLinha={(e) => e.nome}
                  classeDaLinha={(e) => (e.is_active ? '' : 'opacity-60')}
                  colunas={[
                    { chave: 'nome', cabecalho: 'Nome', render: (e) => <span className="font-medium">{e.nome}</span> },
                    { chave: 'telefone', cabecalho: 'WhatsApp', render: (e) => e.telefone || '—' },
                    {
                      chave: 'ativo', cabecalho: 'Ativo', alinhamento: 'direita',
                      render: (e) => <Switch ligado={e.is_active} onMudar={() => alternar(e)} rotulo={`${e.nome} ativo`} />,
                    },
                  ]}
                />
              </div>
            )}
            <form onSubmit={cadastrar} className="flex flex-wrap items-end gap-3">
              <div className="w-56 max-sm:w-full">
                <Input label="Nome" value={nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)} />
              </div>
              <div className="w-44 max-sm:w-full">
                <Input label="WhatsApp" inputMode="tel" placeholder="(63) 99999-0000" value={telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefone(e.target.value)} />
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
