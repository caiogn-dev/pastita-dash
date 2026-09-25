import React from 'react';
import { Switch as InterruptorUnico } from '../common/Switch';

export interface SwitchProps {
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  /** Nome acessível: o que liga e desliga ("Programa ativo"). */
  rotulo: string;
  desabilitado?: boolean;
  className?: string;
}

/**
 * Interruptor do kit, com props em português. Por dentro é o interruptor
 * único de `components/common/Switch` (o único que declara o papel de switch,
 * ver `especificacao-de-interruptor.spec`). Para escolhas com consequência que
 * a pessoa precisa entender antes, use `ChoiceCards`.
 */
export const Switch: React.FC<SwitchProps> = ({ ligado, onMudar, rotulo, desabilitado = false, className }) => (
  <InterruptorUnico checked={ligado} onChange={onMudar} disabled={desabilitado} ariaLabel={rotulo} className={className} />
);
