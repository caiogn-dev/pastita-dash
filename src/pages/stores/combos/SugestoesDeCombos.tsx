/**
 * "Clientes compram juntos" (do admin do Prefiro): pares que saíram no mesmo
 * pedido 3+ vezes nos últimos 60 dias. Fato do histórico, não palpite de IA —
 * o dono confere e decide. Sem sugestão, o card não aparece.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/ui';
import { ajudasDoCadastro, type SugestaoDeCombo } from '../../../services/ajudasDoCadastro';
import { formatCurrency } from '../../../utils/formatters';
import logger from '../../../services/logger';

interface Props {
  storeSlug: string;
  onMontar: (s: SugestaoDeCombo) => void;
}

export const SugestoesDeCombos: React.FC<Props> = ({ storeSlug, onMontar }) => {
  const [sugestoes, setSugestoes] = useState<SugestaoDeCombo[]>([]);

  useEffect(() => {
    if (!storeSlug) return;
    let vivo = true;
    ajudasDoCadastro.sugestoesDeCombos(storeSlug)
      .then((s) => { if (vivo) setSugestoes(s); })
      // Ajuda, não tela principal: se falhar, a lista de combos segue.
      .catch((err) => logger.error('Erro ao buscar sugestões de combos:', err));
    return () => { vivo = false; };
  }, [storeSlug]);

  if (sugestoes.length === 0) return null;

  return (
    <section className="superficie mb-4 p-4" aria-label="Compram juntos">
      <p className="overline mb-2">Compram juntos</p>
      <ul className="divide-y divide-border-token">
        {sugestoes.map((s) => (
          <li key={s.produtos.map((p) => p.id).join('+')} className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-0 flex-1 text-sm text-fg-token">
              {s.produtos.map((p) => p.nome).join(' + ')}
              <span className="ml-2 text-xs text-fg-muted-token">{s.pedidos_juntos} pedidos</span>
            </span>
            <span className="text-sm tabular-nums">
              <s className="mr-1 text-fg-muted-token">{formatCurrency(s.preco_somado)}</s>
              {formatCurrency(s.preco_sugerido)}
            </span>
            <Button size="sm" variant="outline" onClick={() => onMontar(s)}>Montar</Button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SugestoesDeCombos;
