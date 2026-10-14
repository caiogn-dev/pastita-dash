/**
 * O jeito de pedir um telefone. Máscara brasileira enquanto digita e, de
 * volta, só os dígitos. Começou com "+" é estrangeiro: o número fica como
 * veio, sem DDD inventado — a máscara nacional num celular espanhol fazia o
 * atendente ligar para Uberlândia (Layane, ago/26).
 */
import React from 'react';

import { Campo } from './Campo';
import { Input } from './input';

export interface CampoDeTelefoneProps {
  rotulo: string;
  /** Só dígitos ("11987654321") ou "+" e dígitos para estrangeiro. */
  valor: string;
  onMudar: (valor: string) => void;
  dica?: React.ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  desabilitado?: boolean;
  className?: string;
}

function mascaraNacional(digitos: string): string {
  if (digitos.length <= 2) return digitos ? `(${digitos}` : '';
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  // Até 10 dígitos o grupo do meio tem 4 (fixo); no 11º vira celular (5).
  const meio = digitos.length > 10 ? 5 : 4;
  if (resto.length <= meio) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}

/** 12 ou 13 dígitos começando com 55 = número brasileiro com o código do país,
 *  que é como o backend devolve o número depois de normalizar. */
const comCodigoDoBrasil = (digitos: string) => digitos.length >= 12 && digitos.startsWith('55');

export function mascararTelefone(valor: string): string {
  const texto = String(valor || '');
  const digitos = texto.replace(/\D/g, '');
  const internacional = texto.trim().startsWith('+');
  if ((internacional && digitos.startsWith('55') && digitos.length > 2) || (!internacional && comCodigoDoBrasil(digitos))) {
    return `+55 ${mascaraNacional(digitos.slice(2, 13))}`;
  }
  if (internacional) return `+${digitos}`;
  return mascaraNacional(digitos);
}

export function limparTelefone(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '');
  if (bruto.trim().startsWith('+')) return `+${digitos.slice(0, 15)}`;
  // O número salvo pode voltar com o 55 na frente: cortar em 11 aqui gravava
  // outro número na primeira edição.
  if (comCodigoDoBrasil(digitos)) return digitos.slice(0, 13);
  return digitos.slice(0, 11);
}

export const CampoDeTelefone: React.FC<CampoDeTelefoneProps> = ({
  rotulo, valor, onMudar, dica, erro, obrigatorio, desabilitado, className,
}) => (
  <Campo rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio} className={className}>
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(00) 00000-0000"
      className="tabular-nums"
      value={mascararTelefone(valor)}
      disabled={desabilitado}
      onChange={(e) => onMudar(limparTelefone(e.target.value))}
    />
  </Campo>
);

CampoDeTelefone.displayName = 'CampoDeTelefone';

export default CampoDeTelefone;
