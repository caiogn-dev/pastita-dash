/**
 * "Custo e margem" no resumo da receita.
 *
 * Nunca mostra custo parcial: com um ingrediente sem preço, o custo do prato
 * sairia menor e a margem maior do que a real — e é nesse número que o dono
 * confia para decidir o preço. Então fica em branco e diz quem falta.
 */
import React from 'react';
import type { FichaDeCusto } from '../../services/nutrition';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { listaDeNomes } from './rotulosDeNutriente';

const pct = (v: string | null) => (v == null ? '—' : formatPercent(Number(v)));

export default function BlocoDeCusto({ custo }: { custo: FichaDeCusto }) {
  const faltam = custo.ingredientes_sem_preco;
  const prejuizo = custo.margem_bruta_valor != null && Number(custo.margem_bruta_valor) < 0;
  return (
    <div className="border-t border-border-token pt-3 space-y-2">
      <p className="text-sm font-medium">Custo e margem</p>
      {custo.custo_total == null ? (
        faltam.length > 0 && (
          <p className="text-xs text-[var(--warning)]">
            Sem preço: <b>{listaDeNomes(faltam)}</b>. Informe quanto você paga por eles em
            Meus ingredientes para ver o custo do prato.
          </p>
        )
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
          <div><dt className="text-fg-muted-token">Custo do prato</dt><dd className="font-semibold tabular-nums">{formatCurrency(custo.custo_total)}</dd></div>
          <div><dt className="text-fg-muted-token">Custo por porção</dt><dd className="font-semibold tabular-nums">{custo.custo_por_porcao == null ? '—' : formatCurrency(custo.custo_por_porcao)}</dd></div>
          <div><dt className="text-fg-muted-token">Preço de venda</dt><dd className="font-semibold tabular-nums">{custo.preco_de_venda == null ? '—' : formatCurrency(custo.preco_de_venda)}</dd></div>
          <div>
            <dt className="text-fg-muted-token">Margem bruta</dt>
            <dd className={`font-semibold tabular-nums ${prejuizo ? 'text-[var(--danger)]' : ''}`}>
              {custo.margem_bruta_valor == null ? '—' : `${formatCurrency(custo.margem_bruta_valor)} · ${pct(custo.margem_bruta_pct)}`}
              {prejuizo && <span className="block font-normal">prejuízo a cada venda</span>}
            </dd>
          </div>
          <div><dt className="text-fg-muted-token">CMV</dt><dd className="font-semibold tabular-nums">{pct(custo.cmv_pct)}</dd></div>
        </dl>
      )}
    </div>
  );
}
