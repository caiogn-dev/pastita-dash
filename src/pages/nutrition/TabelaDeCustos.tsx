/**
 * Custo e margem de todos os pratos com receita — onde a loja perde dinheiro.
 *
 * A ordem vem do servidor: pior margem primeiro, e os pratos com ingrediente
 * sem preço no fim, marcados. Ordenar aqui de novo seria uma segunda regra
 * para a mesma pergunta.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { buscarCustosDaLoja, CustoDoPrato } from '../../services/nutrition';
import { Badge, Button, EmptyState, Tabela } from '../../components/ui';
import { estadoDaLista } from '../../utils/estadoDaLista';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { listaDeNomes } from './rotulosDeNutriente';

const dinheiro = (v: string | null) => (v == null ? '—' : formatCurrency(v));
const pct = (v: string | null) => (v == null ? '—' : formatPercent(Number(v)));

export default function TabelaDeCustos({ storeUuid }: { storeUuid?: string }) {
  const [pratos, setPratos] = useState<CustoDoPrato[]>([]);
  const [temDados, setTemDados] = useState(false);
  // Começa buscando: sem isto o primeiro quadro diria "nenhum prato" antes
  // da resposta chegar.
  const [buscando, setBuscando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    if (!storeUuid) return;
    setBuscando(true);
    setFalhou(false);
    try {
      setPratos(await buscarCustosDaLoja(storeUuid));
      setTemDados(true);
    } catch {
      setFalhou(true);
    } finally {
      setBuscando(false);
    }
  }, [storeUuid]);
  useEffect(() => { carregar(); }, [carregar]);

  const estado = estadoDaLista({ temDados, buscando, falhou, quantidade: pratos.length });

  if (estado === 'falhou') {
    return (
      <EmptyState
        titulo="Não foi possível carregar os custos"
        descricao="A conexão falhou. Isso não quer dizer que seus pratos não têm custo — tente de novo."
        acao={<Button variant="secondary" onClick={carregar}>Tentar de novo</Button>}
      />
    );
  }

  return (
    <Tabela<CustoDoPrato>
      itens={pratos}
      chave={(p) => p.produto_id}
      rotuloDaLinha={(p) => p.produto}
      carregando={estado === 'carregando'}
      vazio={{
        titulo: 'Nenhum prato com receita ainda',
        descricao: 'Monte a receita de um prato acima e informe quanto você paga pelos ingredientes: o custo e a margem aparecem aqui.',
        icone: <CalculatorIcon className="h-12 w-12" />,
      }}
      colunas={[
        {
          chave: 'prato',
          cabecalho: 'Prato',
          render: (p) => (
            <div className="min-w-0">
              <span className="font-medium text-fg-token">{p.produto}</span>
              {!p.completo && (
                <div className="mt-0.5">
                  <Badge tone="warning">
                    {p.ingredientes_sem_preco.length
                      ? `sem preço: ${listaDeNomes(p.ingredientes_sem_preco)}`
                      : 'sem preço de venda'}
                  </Badge>
                </div>
              )}
            </div>
          ),
        },
        { chave: 'preco', cabecalho: 'Preço de venda', alinhamento: 'direita', classe: 'tabular-nums', render: (p) => dinheiro(p.preco_de_venda) },
        { chave: 'custo', cabecalho: 'Custo do prato', alinhamento: 'direita', classe: 'tabular-nums', render: (p) => dinheiro(p.custo_total) },
        {
          chave: 'margem',
          cabecalho: 'Margem bruta',
          alinhamento: 'direita',
          classe: 'tabular-nums',
          render: (p) => (
            <span className={p.margem_bruta_valor != null && Number(p.margem_bruta_valor) < 0 ? 'text-[var(--danger)]' : ''}>
              {dinheiro(p.margem_bruta_valor)}
            </span>
          ),
        },
        { chave: 'margem_pct', cabecalho: 'Margem %', alinhamento: 'direita', classe: 'tabular-nums', render: (p) => pct(p.margem_bruta_pct) },
        { chave: 'cmv', cabecalho: 'CMV %', alinhamento: 'direita', classe: 'tabular-nums', render: (p) => pct(p.cmv_pct) },
      ]}
    />
  );
}
