/**
 * O jeito de pedir um valor em reais. Digitar enche pelos centavos, como na
 * maquininha: "1990" vira 19,90 sem ninguém procurar a vírgula. Colar entende
 * reais ("R$ 12,5", "1.234,56", "12.50"), porque quem cola copiou um preço.
 *
 * Vazio é `null`, não zero: "sem preço" e "grátis" são coisas diferentes.
 */
import React from 'react';

import { formatCurrency, lerDinheiro } from '../../utils/formatters';
import { Campo } from './Campo';
import { Input } from './input';

export interface CampoDeDinheiroProps {
  rotulo: string;
  valor: number | null;
  onMudar: (valor: number | null) => void;
  dica?: React.ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  desabilitado?: boolean;
  className?: string;
  'data-testid'?: string;
}

const LIMITE_EM_CENTAVOS = 99_999_999_99; // R$ 99 milhões: além disso é dedo escorregando

export const CampoDeDinheiro: React.FC<CampoDeDinheiroProps> = ({
  rotulo, valor, onMudar, dica, erro, obrigatorio, desabilitado, className, ...resto
}) => {
  const texto = valor === null || valor === undefined ? '' : formatCurrency(valor, { semSimbolo: true });

  const digitar = (bruto: string) => {
    const digitos = bruto.replace(/\D/g, '').replace(/^0+/, '');
    if (!digitos) return onMudar(null);
    onMudar(Math.min(Number(digitos), LIMITE_EM_CENTAVOS) / 100);
  };

  const colar = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const colado = e.clipboardData.getData('text').replace(/[^\d.,-]/g, '');
    if (!colado) return;
    e.preventDefault();
    onMudar(Math.round(lerDinheiro(colado) * 100) / 100);
  };

  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio} className={className}>
      <Input
        inputMode="numeric"
        autoComplete="off"
        leftAddon="R$"
        placeholder="0,00"
        className="tabular-nums"
        value={texto}
        disabled={desabilitado}
        onChange={(e) => digitar(e.target.value)}
        onPaste={colar}
        data-testid={resto['data-testid']}
      />
    </Campo>
  );
};

CampoDeDinheiro.displayName = 'CampoDeDinheiro';

export default CampoDeDinheiro;
