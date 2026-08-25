/**
 * A campanha de "entrega grátis até X km".
 *
 * Separada do card de preço de propósito: a fórmula é o custo permanente da
 * operação, isto entra e sai. Se morassem juntos, desligar a campanha exigiria
 * mexer no preço de sempre.
 *
 * Os dois números aqui decidem margem, então a tela mostra o que eles custam:
 * quanto de frete a loja deixa de cobrar por pedido, e a frase exata que o
 * cliente vai ler. Sem isso o dono digita "grátis até 10 km" sem perceber que
 * está dando R$ 15 por entrega.
 */
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import { lerFormula } from './FormulaDeEntregaCard';
import {
  custoPorPedidoNoRaio,
  gravarPromo,
  lerPromo,
  problemasDaPromo,
  reais,
  textoDaPromo,
  type PromoDeFrete,
} from './freteGratis';

interface Props {
  metadataAtual: Record<string, unknown>;
  onSalvar: (novoMetadata: Record<string, unknown>) => Promise<void>;
}

export const FreteGratisCard: React.FC<Props> = ({ metadataAtual, onSalvar }) => {
  const [promo, setPromo] = useState<PromoDeFrete>(() => lerPromo(metadataAtual));
  const [salvando, setSalvando] = useState(false);

  const formula = useMemo(() => lerFormula(metadataAtual), [metadataAtual]);
  const problemas = useMemo(() => problemasDaPromo(promo, formula), [promo, formula]);
  const custo = useMemo(
    () => custoPorPedidoNoRaio(formula, promo.ateKm),
    [formula, promo.ateKm],
  );
  const frase = textoDaPromo(promo);

  const salvar = async () => {
    if (problemas.length > 0) {
      toast.error('Corrija os avisos antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(gravarPromo(metadataAtual, promo));
      toast.success(promo.ativo ? 'Frete grátis ligado' : 'Frete grátis desligado');
    } catch {
      toast.error('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fg-token">Frete grátis</h2>
          <p className="mt-1 text-sm text-fg-muted-token">
            Uma promoção por distância de rota, por cima do preço acima. Some quando você desligar.
          </p>
        </div>
        <label className="flex flex-none items-center gap-2 text-sm text-fg-token">
          <input
            type="checkbox"
            checked={promo.ativo}
            onChange={(e) => setPromo((p) => ({ ...p, ativo: e.target.checked }))}
            className="h-4 w-4 rounded border-border-token"
          />
          Ligado
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="frete-gratis-km" className="block text-sm font-medium text-fg-token">
            Grátis até
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="frete-gratis-km"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              disabled={!promo.ativo}
              value={promo.ateKm ?? ''}
              onChange={(e) =>
                setPromo((p) => ({ ...p, ateKm: e.target.value === '' ? null : Number(e.target.value) }))
              }
              className="w-28 rounded border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token disabled:opacity-50"
            />
            <span className="text-sm text-fg-muted-token">km</span>
          </div>
          <p className="mt-1 text-xs text-fg-muted-token">
            Distância de ROTA — o caminho que o entregador faz, não linha reta. Quem estiver dentro dela não paga entrega.
          </p>
        </div>

        <div>
          <label htmlFor="frete-gratis-minimo" className="block text-sm font-medium text-fg-token">
            Pedido mínimo <span className="font-normal text-fg-muted-token">(opcional)</span>
          </label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-fg-muted-token">R$</span>
            <input
              id="frete-gratis-minimo"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              disabled={!promo.ativo}
              value={promo.pedidoMinimo ?? ''}
              onChange={(e) =>
                setPromo((p) => ({
                  ...p,
                  pedidoMinimo: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="w-28 rounded border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token disabled:opacity-50"
            />
          </div>
          <p className="mt-1 text-xs text-fg-muted-token">
            Vazio = grátis em qualquer valor. Com mínimo, o carrinho mostra quanto falta.
          </p>
        </div>
      </div>

      {problemas.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-fg-token"
        >
          <ul className="list-disc pl-4">
            {problemas.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {promo.ativo && problemas.length === 0 && frase && (
        <div className="mt-4 rounded-xl border border-border-token bg-surface-2-token px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-fg-muted-token">O cliente vê</p>
          <p className="mt-1 text-sm font-medium text-fg-token">{frase}</p>
          {custo !== null && (
            <p className="mt-2 text-xs text-fg-muted-token">
              Você deixa de cobrar até <strong>{reais(custo)}</strong> por pedido dentro da promoção.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </Card>
  );
};

export default FreteGratisCard;
