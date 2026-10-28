/**
 * Som de pedido novo, deste aparelho: liga, volume e testar. O botão de
 * testar também libera o áudio do navegador — sem um clique na página o
 * Chrome não deixa tocar.
 */
import React from 'react';
import { SpeakerWaveIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Card } from '../../components/common';
import { Button, Segmentado, Switch } from '../../components/ui';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { useSomDosPedidos, type VolumeDoSom } from '../../stores/somDosPedidos';

const VOLUMES: { valor: VolumeDoSom; rotulo: string }[] = [
  { valor: 'baixo', rotulo: 'Baixo' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'alto', rotulo: 'Alto' },
];

export function SomDosPedidos() {
  const { ligado, volume, setLigado, setVolume } = useSomDosPedidos();
  const { testar } = useNotificationSound();

  return (
    <Card title="Som dos pedidos" subtitle="Neste aparelho">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-fg-token">Tocar o sino em pedido novo até aceitar</span>
          <Switch ligado={ligado} onMudar={setLigado} rotulo="Som de pedido novo" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmentado rotulo="Volume" opcoes={VOLUMES} valor={volume} onChange={setVolume} />
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<SpeakerWaveIcon className="h-4 w-4" />} onClick={() => testar('sino')}>
              Pedido novo
            </Button>
            <Button variant="outline" leftIcon={<BanknotesIcon className="h-4 w-4" />} onClick={() => testar('pix')}>
              PIX pago
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
