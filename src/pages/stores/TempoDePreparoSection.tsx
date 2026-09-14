import React, { useCallback, useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

import { Card, Button, Input } from '../../components/ui';
import { updateStore } from '../../services/storesApi';
import logger from '../../services/logger';

interface TempoDePreparoSectionProps {
  storeId: string;
  /** `default_prep_minutes` da loja. 0 = sem previsão. */
  minutosAtuais?: number;
}

/**
 * Tempo padrão de preparo. Quando o pedido entra em preparo, este tempo é
 * copiado para ele e vira a previsão "pronto às" no quadro de pedidos — que
 * marca ATRASADO quando passa. Mudar aqui não mexe em pedido que já está no
 * fogo. Zero desliga a previsão.
 */
export const TempoDePreparoSection: React.FC<TempoDePreparoSectionProps> = ({
  storeId,
  minutosAtuais = 0,
}) => {
  const [valor, setValor] = useState(minutosAtuais ? String(minutosAtuais) : '');
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setValor(minutosAtuais ? String(minutosAtuais) : ''); }, [minutosAtuais]);

  const salvar = useCallback(async () => {
    setErro('');
    setSalvo(false);
    const limpo = valor.trim();
    const minutos = limpo === '' ? 0 : Number(limpo);
    if (!Number.isInteger(minutos) || minutos < 0 || minutos > 600) {
      setErro('Use um número inteiro de 0 a 600 minutos.');
      return;
    }
    setSalvando(true);
    try {
      await updateStore(storeId, { default_prep_minutes: minutos });
      setSalvo(true);
    } catch (e) {
      logger.error('Erro ao salvar tempo de preparo:', e);
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }, [storeId, valor]);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <ClockIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-fg-token">Tempo de preparo</h3>
          <p className="text-sm text-fg-muted-token">
            Quanto um pedido leva da cozinha até ficar pronto. O quadro de
            pedidos mostra &quot;pronto às&quot; e marca ATRASADO quando passar.
            Deixe 0 para não usar previsão.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-[12rem]">
          <Input
            id="tempo-de-preparo"
            label="Minutos"
            inputMode="numeric"
            value={valor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setValor(e.target.value); setSalvo(false); }}
            error={erro || undefined}
          />
        </div>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
        {salvo && <span className="text-sm text-fg-muted-token">Salvo.</span>}
      </div>
    </Card>
  );
};

export default TempoDePreparoSection;
