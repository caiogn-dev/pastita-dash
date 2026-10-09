/**
 * Lotes de produção (09/10): o código que sai na etiqueta (EST-09102601) leva
 * ao prato, ao dia de fabricação, à validade e a quantas etiquetas saíram.
 * É a tela para recolher um lote quando um cliente reclama.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FalhaAoCarregar, PageShell, Tabela, type ColunaDaTabela } from '../../components/ui';
import { listarLotes, type LoteDeProducao } from '../../services/printing';
import { estadoDaLista } from '../../utils/estadoDaLista';

const data = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

const situacao = (validade: string) => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const [a, m, d] = validade.split('-').map(Number);
  const dias = Math.round((new Date(a, m - 1, d).getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return { texto: 'Vencido', classe: 'bg-danger-soft text-danger-token' };
  if (dias <= 7) return { texto: `Vence em ${dias} d`, classe: 'bg-warning-soft text-warning-token' };
  return { texto: 'No prazo', classe: 'bg-success-soft text-success-token' };
};

const colunas: ColunaDaTabela<LoteDeProducao>[] = [
  { chave: 'codigo', cabecalho: 'Lote', render: (l) => <span className="font-mono font-semibold tabular-nums">{l.codigo}</span> },
  { chave: 'prato', cabecalho: 'Prato', render: (l) => l.produto_nome },
  { chave: 'fabricacao', cabecalho: 'Fabricação', render: (l) => <span className="tabular-nums">{data(l.fabricacao)}</span> },
  { chave: 'validade', cabecalho: 'Validade', render: (l) => <span className="tabular-nums">{data(l.validade)}</span> },
  {
    chave: 'situacao', cabecalho: 'Situação', render: (l) => {
      const s = situacao(l.validade);
      return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.classe}`}>{s.texto}</span>;
    },
  },
  { chave: 'etiquetas', cabecalho: 'Etiquetas', alinhamento: 'direita', render: (l) => <span className="tabular-nums">{l.etiquetas}</span> },
];

export default function LotesPage() {
  const { storeId = '' } = useParams();
  const [busca, setBusca] = useState('');
  const consulta = useQuery({
    queryKey: ['lotes', storeId, busca],
    queryFn: async () => (await listarLotes({ store: storeId, q: busca || undefined, page_size: 200 })).data,
    enabled: !!storeId,
  });
  const itens = consulta.data?.results ?? [];
  const estado = estadoDaLista({
    temDados: consulta.data !== undefined,
    buscando: consulta.isFetching,
    falhou: consulta.isError,
    quantidade: itens.length,
  });

  return (
    <PageShell
      titulo="Lotes"
      filtros={(
        <label className="relative block max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted-token" />
          <input
            id="busca-lote"
            aria-label="Buscar lote ou prato"
            className="controle h-10 w-full pl-9 pr-3 text-sm"
            placeholder="EST-09102601 ou nome do prato"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      )}
    >
      {estado === 'falhou' ? (
        <FalhaAoCarregar titulo="Não consegui carregar os lotes." onTentarDeNovo={() => void consulta.refetch()} />
      ) : (
        <Tabela
          itens={itens}
          colunas={colunas}
          chave={(l) => l.id}
          rotuloDaLinha={(l) => `${l.codigo} ${l.produto_nome}`}
          carregando={estado === 'carregando'}
          vazio={{
            titulo: busca ? 'Nenhum lote encontrado' : 'Nenhum lote ainda',
            descricao: busca ? undefined : 'O lote nasce quando você imprime a etiqueta com o campo de lote.',
          }}
        />
      )}
    </PageShell>
  );
}
