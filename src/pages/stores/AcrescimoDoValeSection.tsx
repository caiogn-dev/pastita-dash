import React, { useCallback, useEffect, useState } from 'react';
import { ReceiptPercentIcon } from '@heroicons/react/24/outline';

import { Card, Button, Input } from '../../components/ui';
import { updateStore } from '../../services/storesApi';
import logger from '../../services/logger';

interface AcrescimoDoValeSectionProps {
  storeId: string;
  /** O percentual que a loja cobra hoje — vem do `voucher_fee_percent` da loja. */
  percentualAtual?: number;
}

/**
 * Quanto o CLIENTE paga a mais quando escolhe pagar com vale.
 *
 * Vale para os dois caminhos — vale integrado (VR, Pluxee, Ticket) e vale por
 * QR Code (Vólus): para o cliente os dois são "pagar com vale", e a regra não
 * pode depender de como a cobrança acontece nos bastidores.
 *
 * Zero desliga. O cardápio mostra a linha do acréscimo no instante em que o
 * cliente marca o vale, antes de confirmar.
 */
export const AcrescimoDoValeSection: React.FC<AcrescimoDoValeSectionProps> = ({
  storeId,
  percentualAtual = 0,
}) => {
  const [valor, setValor] = useState(percentualAtual ? String(percentualAtual) : '');
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setValor(percentualAtual ? String(percentualAtual) : ''); }, [percentualAtual]);

  const numero = Number(String(valor).replace(',', '.'));

  const salvar = useCallback(async () => {
    setErro('');
    setSalvo(false);
    const limpo = String(valor).trim();
    const pct = limpo === '' ? 0 : Number(limpo.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setErro('Use um número entre 0 e 100.');
      return;
    }
    setSalvando(true);
    try {
      await updateStore(storeId, { voucher_fee_percent: pct } as never);
      setSalvo(true);
    } catch (e) {
      logger.error('Erro ao salvar acréscimo do vale:', e);
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }, [storeId, valor]);

  const exemplo = Number.isFinite(numero) && numero > 0 && numero <= 100
    ? (Math.floor(5000 * numero / 100) / 100).toFixed(2).replace('.', ',')
    : null;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <ReceiptPercentIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-fg-token">Acréscimo para pagar com vale</h3>
          <p className="text-sm text-fg-muted-token">
            O cliente que escolhe vale-refeição ou vale-alimentação paga este
            percentual a mais. Vale para todas as bandeiras, inclusive a paga
            por QR Code. Deixe 0 para não cobrar.
          </p>
        </div>
      </div>

      <div className="max-w-[12rem]">
        <Input
          id="acrescimo-vale"
          label="Acréscimo (%)"
          inputMode="decimal"
          placeholder="0"
          value={valor}
          onChange={(e) => { setValor(e.target.value); setSalvo(false); }}
        />
      </div>
      {exemplo && (
        <p className="mt-2 text-sm text-fg-muted-token">
          Num pedido de R$ 50,00, o cliente paga R$ {exemplo} a mais.
        </p>
      )}

      {erro && <p role="alert" className="mt-3 text-sm text-danger-500">{erro}</p>}
      {salvo && !erro && <p role="status" className="mt-3 text-sm text-fg-muted-token">Salvo.</p>}

      <Button className="mt-4" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </Card>
  );
};

export default AcrescimoDoValeSection;
