/**
 * Partes da página de bio — a coluna da esquerda do editor.
 *
 * Mesmo molde do editor do Storefront: lista curta de partes, a página de
 * verdade no meio, propriedades da parte escolhida à direita. A parte aberta
 * vive na URL (`?parte=`), então recarregar não perde o lugar.
 */
import type React from 'react';
import {
  ChartBarIcon,
  LinkIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export type ParteDaBio = 'perfil' | 'botoes' | 'links' | 'estatisticas';

export interface DefinicaoDaParteDaBio {
  id: ParteDaBio;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
}

export const PARTES_DA_BIO: DefinicaoDaParteDaBio[] = [
  { id: 'perfil', rotulo: 'Perfil', icone: UserCircleIcon },
  { id: 'botoes', rotulo: 'Botões fixos', icone: Squares2X2Icon },
  { id: 'links', rotulo: 'Links', icone: LinkIcon },
  { id: 'estatisticas', rotulo: 'Estatísticas', icone: ChartBarIcon },
];

export const PARTE_DA_BIO_PADRAO: ParteDaBio = 'perfil';

export const ehParteDaBio = (v: string | null): v is ParteDaBio =>
  PARTES_DA_BIO.some((p) => p.id === v);

export const definicaoDaParteDaBio = (id: ParteDaBio): DefinicaoDaParteDaBio =>
  PARTES_DA_BIO.find((p) => p.id === id) ?? PARTES_DA_BIO[0];
