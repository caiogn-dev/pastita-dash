/**
 * Desconto para quem retira no balcão (Black 26/11 na Cê: 20% no total).
 *
 * Grava em `metadata.desconto_retirada` = {ativo, percentual, fim?} — o servidor
 * aplica no checkout (desconto_retirada.py) e o cardápio mostra o selo
 * "Retirada −X% no pedido". "Até" vazio = vale até desligar.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui';
import { Switch } from '../../components/common/Switch';

export type DescontoRetirada = { ativo: boolean; percentual: number | null; ate: string };

const CHAVE = 'desconto_retirada';

export function lerDescontoRetirada(metadata: Record<string, unknown>): DescontoRetirada {
  const bruto = (metadata?.[CHAVE] ?? {}) as { ativo?: boolean; percentual?: number; fim?: string };
  return {
    ativo: Boolean(bruto.ativo),
    percentual: typeof bruto.percentual === 'number' ? bruto.percentual : null,
    ate: typeof bruto.fim === 'string' ? bruto.fim.slice(0, 10) : '',
  };
}

export function gravarDescontoRetirada(metadata: Record<string, unknown>, d: DescontoRetirada) {
  const bloco: Record<string, unknown> = { ativo: d.ativo, percentual: d.percentual ?? 0 };
  if (d.ate) bloco.fim = `${d.ate}T23:59:59-03:00`;
  return { ...metadata, [CHAVE]: bloco };
}

export function problemaDoDesconto(d: DescontoRetirada): string | null {
  if (!d.ativo) return null;
  if (d.percentual == null || !(d.percentual > 0) || d.percentual > 100) return 'Informe um desconto entre 1% e 100%.';
  return null;
}

interface Props {
  metadataAtual: Record<string, unknown>;
  onSalvar: (novoMetadata: Record<string, unknown>) => Promise<void>;
}

export const DescontoRetiradaCard: React.FC<Props> = ({ metadataAtual, onSalvar }) => {
  const [d, setD] = useState<DescontoRetirada>(() => lerDescontoRetirada(metadataAtual));
  const [salvando, setSalvando] = useState(false);
  const problema = problemaDoDesconto(d);

  const salvar = async () => {
    if (problema) {
      toast.error(problema);
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(gravarDescontoRetirada(metadataAtual, d));
      toast.success(d.ativo ? 'Desconto na retirada ligado' : 'Desconto na retirada desligado');
    } catch {
      toast.error('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-sm font-bold text-fg-token">Desconto na retirada</h2>
        <Switch
          checked={d.ativo}
          onChange={(v) => setD((p) => ({ ...p, ativo: v }))}
          ariaLabel="Desconto na retirada ligado"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="retirada-percentual" className="block text-sm font-medium text-fg-token">Desconto</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="retirada-percentual"
              type="number"
              min="1"
              max="100"
              step="1"
              inputMode="decimal"
              disabled={!d.ativo}
              value={d.percentual ?? ''}
              onChange={(e) => setD((p) => ({ ...p, percentual: e.target.value === '' ? null : Number(e.target.value) }))}
              className="w-28 rounded border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token disabled:opacity-50"
            />
            <span className="text-sm text-fg-muted-token">% no pedido</span>
          </div>
        </div>
        <div>
          <label htmlFor="retirada-ate" className="block text-sm font-medium text-fg-token">
            Até <span className="font-normal text-fg-muted-token">(opcional)</span>
          </label>
          <input
            id="retirada-ate"
            type="date"
            disabled={!d.ativo}
            value={d.ate}
            onChange={(e) => setD((p) => ({ ...p, ate: e.target.value }))}
            className="mt-1 rounded border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token disabled:opacity-50"
          />
        </div>
      </div>

      {problema && (
        <p role="alert" className="mt-4 text-sm text-[var(--warning)]">{problema}</p>
      )}

      {d.ativo && !problema && (
        <div className="mt-4 superficie-2-token px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-fg-muted-token">O cliente vê</p>
          <p className="mt-1 text-sm font-medium text-fg-token">Retirada −{d.percentual}% no pedido</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </div>
  );
};

export default DescontoRetiradaCard;
