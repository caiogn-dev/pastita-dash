import React, { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../components/ui';
import { ShareIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import { cashbackService } from '../../services/cashback';
import {
  ordenarIndicadores, rotuloDoAmigo, rotuloDoIndicador, telefoneLegivel,
  type IndicacaoRow, type IndicadorAgregado,
} from './indicacoes';

/**
 * "Quem veio pela Elisangela?"
 *
 * A pergunta do dono (04/09) que o painel não respondia. A tela de cashback
 * mostrava "saldo de indicação: R$ 12,40" — um total somado, sem um nome. Com
 * isso a loja não consegue agradecer quem trouxe cliente, não sabe quem são
 * seus divulgadores, e não percebe um mesmo telefone "indicando" trinta
 * desconhecidos.
 *
 * DUAS LEITURAS, e a ordem responde à pergunta certa:
 *
 *   1. POR QUEM INDICOU, no topo. É a lista de a quem ligar e agradecer, e a
 *      única que revela padrão — quem traz gente toda semana, e quem traz
 *      gente demais rápido demais.
 *   2. As indicações uma a uma, embaixo, para conferir um caso específico.
 *
 * O VAZIO É O ESTADO MAIS PROVÁVEL por enquanto, e por isso não é um "nada
 * aqui": ele explica que a indicação é rastreada pelo link que o cliente pega
 * na carteira. Um vazio mudo faria o dono achar que o programa está quebrado
 * quando ele só não começou.
 */
export const IndicacoesCard: React.FC<{ storeSlug: string }> = ({ storeSlug }) => {
  const [linhas, setLinhas] = useState<IndicacaoRow[]>([]);
  const [porIndicador, setPorIndicador] = useState<IndicadorAgregado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    cashbackService.indicacoes(storeSlug)
      .then((d) => {
        if (!vivo) return;
        setLinhas(d.indicacoes || []);
        setPorIndicador(ordenarIndicadores(d.por_indicador || []));
      })
      .catch(() => { /* aba secundária: falha aqui não derruba a página */ })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [storeSlug]);

  if (carregando) {
    return <Card title="Indicações"><div className="h-24 animate-pulse rounded bg-surface-2" /></Card>;
  }

  if (!linhas.length) {
    return (
      <Card title="Indicações">
        <EmptyState
          icone={<ShareIcon />}
          titulo="Nenhuma indicação ainda"
          descricao={
            'A indicação é rastreada pelo link que o cliente pega na página da '
            + 'carteira dele — o link leva o número de quem indicou. Quando o '
            + 'amigo comprar por esse link, ele aparece aqui com nome e pedido.'
          }
        />
      </Card>
    );
  }

  return (
    <Card title="Indicações">
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-body font-semibold text-fg-token">Quem mais trouxe gente</h3>
          <ul className="divide-y divide-border-token">
            {porIndicador.map((i) => (
              <li key={i.phone} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-body text-fg-token">
                    {rotuloDoIndicador(i)}
                  </span>
                  {i.nome && (
                    <span className="block text-caption text-fg-muted-token">
                      {telefoneLegivel(i.phone)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-body font-semibold text-fg-token">
                    {i.total_indicados} {i.total_indicados === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                  <span className="block text-caption text-fg-muted-token">
                    {formatCurrency(Number(i.total_creditado))} creditados
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-body font-semibold text-fg-token">Cada indicação</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead className="text-caption text-fg-muted-token">
                <tr>
                  <th className="py-2 pr-4 font-medium">Quem indicou</th>
                  <th className="py-2 pr-4 font-medium">Quem veio</th>
                  <th className="py-2 pr-4 font-medium">Pedido</th>
                  <th className="py-2 text-right font-medium">Creditado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-token">
                {linhas.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 text-fg-token">
                      {rotuloDoIndicador({ phone: r.indicador_phone, nome: r.indicador_nome })}
                    </td>
                    <td className="py-2.5 pr-4 text-fg-token">{rotuloDoAmigo(r)}</td>
                    <td className="py-2.5 pr-4 text-fg-muted-token">{r.pedido}</td>
                    <td className="py-2.5 text-right font-medium text-fg-token">
                      {formatCurrency(Number(r.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};
