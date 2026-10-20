/**
 * Simulador de taxa: endereço (ou link do Maps) → o que o cliente paga.
 *
 * Chama o MESMO endpoint do checkout. Refazer a conta na tela daria um número
 * que concorda com a fórmula e discorda do cliente sempre que houver zona de
 * preço fixo, rota por ruas ou área máxima — exatamente os casos que o dono
 * quer conferir.
 */
import React, { useState } from 'react';
import { Card, Button, Input } from '../../components/ui';
import { ordersService, type CalculatedDeliveryFee } from '../../services/orders';
import { getErrorMessage } from '../../services/api';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { lerPromo, type PromoDeFrete } from './freteGratis';

export interface LeituraDaSimulacao {
  titulo: string;
  detalhes: string[];
  fora: boolean;
  promo: string | null;
}

export function leituraDaSimulacao(
  r: CalculatedDeliveryFee,
  promo: PromoDeFrete | null,
): LeituraDaSimulacao {
  const km = typeof r.distance_km === 'number' ? r.distance_km : null;
  const detalhes = [
    km !== null ? `${formatNumber(km, { maximumFractionDigits: 1 })} km` : null,
    typeof r.duration_minutes === 'number' ? `${Math.round(r.duration_minutes)} min` : null,
    r.zone?.name || null,
  ].filter((x): x is string => Boolean(x));

  if (r.is_within_area === false) {
    return { titulo: 'Fora da área de entrega', detalhes, fora: true, promo: null };
  }

  // O endpoint não sabe o valor do pedido vindo do painel (sem carrinho),
  // então a promoção é dita à parte em vez de zerar a taxa.
  const cabeNaPromo = promo?.ativo && km !== null && promo.ateKm !== null && km <= promo.ateKm && r.fee > 0;
  const textoPromo = cabeNaPromo
    ? promo!.pedidoMinimo
      ? `Grátis em pedido a partir de ${formatCurrency(promo!.pedidoMinimo)}`
      : 'Grátis pela promoção de frete'
    : null;

  return {
    titulo: r.fee > 0 ? formatCurrency(r.fee) : 'Grátis',
    detalhes,
    fora: false,
    promo: textoPromo,
  };
}

interface Props {
  storeSlug: string;
  metadataAtual: Record<string, unknown>;
}

export const SimuladorDeFreteCard: React.FC<Props> = ({ storeSlug, metadataAtual }) => {
  const [endereco, setEndereco] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [leitura, setLeitura] = useState<LeituraDaSimulacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const calcular = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = endereco.trim();
    if (!texto) return;
    setCalculando(true);
    setErro(null);
    setLeitura(null);
    try {
      const r = await ordersService.calculateDeliveryFee(storeSlug, texto);
      setLeitura(leituraDaSimulacao(r, lerPromo(metadataAtual)));
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setCalculando(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <h2 className="text-lg font-semibold text-fg-token">Simular taxa</h2>
      <form onSubmit={calcular} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64">
          <Input
            label="Endereço ou link do Maps"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Quadra 104 Sul, Alameda 5, Palmas"
          />
        </div>
        <Button type="submit" disabled={!endereco.trim() || calculando} isLoading={calculando}>
          Calcular
        </Button>
      </form>

      {erro && (
        <p role="alert" className="mt-3 text-sm text-danger-token">{erro}</p>
      )}

      {leitura && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
          <span className={`text-xl font-semibold tabular-nums ${leitura.fora ? 'text-danger-token' : 'text-fg-token'}`}>
            {leitura.titulo}
          </span>
          {leitura.detalhes.length > 0 && (
            <span className="text-sm text-fg-muted-token">{leitura.detalhes.join(' · ')}</span>
          )}
          {leitura.promo && (
            <span className="w-full text-sm font-medium text-success-token">{leitura.promo}</span>
          )}
        </div>
      )}
    </Card>
  );
};
