import React, { useCallback, useEffect, useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/outline';

import { Card } from '../../components/ui';
import { Switch } from '../../components/common';
import {
  getFormasDePagamento,
  updateFormasDePagamento,
  type FormaDePagamento,
} from '../../services/storesApi';
import logger from '../../services/logger';

interface Props {
  storeId: string;
}

/**
 * "No cardápio": as formas de pagamento que o cliente vê, cada uma com
 * interruptor (25/11). Só entram as que a loja PODE oferecer — conectar o
 * Mercado Pago ou o vale continua nas seções de cima. Salva no ato.
 *
 * A última ligada não desliga: cardápio sem forma de pagamento não vende.
 */
export const FormasNoCardapioSection: React.FC<Props> = ({ storeId }) => {
  const [formas, setFormas] = useState<FormaDePagamento[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setFormas((await getFormasDePagamento(storeId)).formas);
    } catch (e) {
      logger.error('Erro ao carregar formas de pagamento:', e);
      setErro('Não consegui carregar as formas de pagamento.');
    }
  }, [storeId]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (!formas) {
    return erro ? <Card className="p-6"><p className="text-sm text-[var(--danger)]">{erro}</p></Card> : null;
  }

  const disponiveis = formas.filter((f) => f.disponivel);
  if (disponiveis.length === 0) return null;
  const ligadas = disponiveis.filter((f) => f.ligada).length;

  const alternar = async (metodo: string, ligar: boolean) => {
    const anterior = formas;
    const novas = formas.map((f) => (f.metodo === metodo ? { ...f, ligada: ligar } : f));
    setFormas(novas);
    setErro('');
    setSalvando(true);
    try {
      const desligadas = novas.filter((f) => !f.ligada).map((f) => f.metodo);
      setFormas((await updateFormasDePagamento(storeId, desligadas)).formas);
    } catch (e) {
      logger.error('Erro ao salvar formas de pagamento:', e);
      setFormas(anterior);
      setErro('Não consegui salvar. Nada mudou no cardápio.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <CreditCardIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-fg-token">Formas de pagamento no cardápio</h3>
          {erro && <p className="mt-2 text-sm text-[var(--danger)]">{erro}</p>}
          <ul className="mt-4 divide-y divide-border-token">
            {disponiveis.map((f) => (
              <li key={f.metodo} className="flex items-center justify-between gap-4 py-3">
                <span id={`forma-${f.metodo}`} className="text-sm text-fg-token">{f.rotulo}</span>
                <Switch
                  checked={f.ligada}
                  disabled={salvando || (f.ligada && ligadas <= 1)}
                  onChange={(marcado) => void alternar(f.metodo, marcado)}
                  ariaLabelledby={`forma-${f.metodo}`}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default FormasNoCardapioSection;
