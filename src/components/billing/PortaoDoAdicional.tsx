/**
 * Mostra o conteúdo só se a loja tem o adicional; senão, o bloqueio com o
 * botão de contratar. Monta o conteúdo apenas depois de liberar: assim a tela
 * bloqueada não dispara as buscas que o servidor responderia com 402.
 */
import React from 'react';

import { Loading } from '../common';
import { PageShell } from '../ui';
import { useAdicional } from '../../hooks/useAdicional';
import type { AdicionalKey } from '../../services/billing';
import { AdicionalBloqueado } from './AdicionalBloqueado';

export interface PortaoDoAdicionalProps {
  chave: AdicionalKey;
  /** Com título, o bloqueio vira página inteira (PageShell); sem, cabe num painel. */
  titulo?: string;
  children: React.ReactNode;
}

export const PortaoDoAdicional: React.FC<PortaoDoAdicionalProps> = ({ chave, titulo, children }) => {
  const adicional = useAdicional(chave);
  if (adicional.estado === 'carregando') return <Loading />;
  if (adicional.liberado) return <>{children}</>;
  const bloqueio = <AdicionalBloqueado etiqueta={adicional} />;
  return titulo ? <PageShell titulo={titulo}>{bloqueio}</PageShell> : bloqueio;
};

export default PortaoDoAdicional;
