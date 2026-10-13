/**
 * Partes da vitrine — a coluna da esquerda do editor do Storefront.
 *
 * O editor segue o padrão de editor de tema (Shopify) e de ferramenta de
 * desenho (Figma/Framer): partes à esquerda, a vitrine de verdade no meio,
 * as propriedades da parte escolhida à direita. Cada parte sabe que pedaço
 * da prévia acende (`area`) e quais campos são dela (o ponto de "não salvo").
 */
import type React from 'react';
import {
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

import type { AreaDaPrevia } from '../../hooks/usePreviaAoVivo';
import type { ExibicaoDoCardapio } from '../../services/exibicaoDoCardapio';

export type Parte = 'topo' | 'estilo' | 'banners' | 'cartao' | 'estoque' | 'pedido' | 'endereco';

/** Campos do formulário da loja (o que vai no PATCH da loja). */
export interface FormDaVitrine {
  template: string;
  primary_color: string;
  secondary_color: string;
  tagline: string;
  custom_domain: string;
}

export interface DefinicaoDaParte {
  id: Parte;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
  area?: AreaDaPrevia;
  campos: (keyof FormDaVitrine)[];
  exibicao: (keyof ExibicaoDoCardapio)[];
  /** Logo e capa ainda não enviados contam como alteração desta parte. */
  arquivos?: boolean;
  /** Separador antes deste item na lista. */
  grupo?: boolean;
}

export const PARTES: DefinicaoDaParte[] = [
  { id: 'topo', rotulo: 'Topo da loja', icone: BuildingStorefrontIcon, area: 'topo', campos: ['tagline'], exibicao: ['logo_formato', 'logo_alinhamento'], arquivos: true },
  { id: 'estilo', rotulo: 'Cores e estilo', icone: SwatchIcon, area: 'topo', campos: ['template', 'primary_color', 'secondary_color'], exibicao: [] },
  { id: 'banners', rotulo: 'Banners', icone: RectangleGroupIcon, area: 'banners', campos: [], exibicao: [] },
  { id: 'cartao', rotulo: 'Cartão do produto', icone: Squares2X2Icon, area: 'cartao', campos: [], exibicao: ['foto_posicao', 'foto_proporcao', 'foto_encaixe', 'descricao_limite'], grupo: true },
  { id: 'estoque', rotulo: 'Estoque e seções', icone: ArchiveBoxIcon, area: 'estoque', campos: [], exibicao: ['mostrar_estoque_baixo', 'mostrar_esgotados', 'mostrar_peca_novamente'] },
  { id: 'pedido', rotulo: 'Pedido feito', icone: CheckBadgeIcon, campos: [], exibicao: ['agradecimento_titulo', 'agradecimento_subtitulo'], grupo: true },
  { id: 'endereco', rotulo: 'Endereço da loja', icone: GlobeAltIcon, campos: ['custom_domain'], exibicao: [] },
];

export const PARTE_PADRAO: Parte = 'topo';

/** Clique na prévia (inspetor) → parte que abre à direita. */
export const PARTE_DA_AREA: Record<AreaDaPrevia, Parte> = {
  topo: 'topo',
  banners: 'banners',
  cartao: 'cartao',
  estoque: 'estoque',
  'peca-novamente': 'estoque',
};

export const definicaoDa = (parte: Parte): DefinicaoDaParte =>
  PARTES.find((p) => p.id === parte) ?? PARTES[0];

export const ehParte = (v: string | null): v is Parte => PARTES.some((p) => p.id === v);

/** A parte tem alteração ainda não salva? */
export function parteMudou(
  parte: DefinicaoDaParte,
  form: FormDaVitrine,
  salvo: FormDaVitrine,
  exibicao: ExibicaoDoCardapio,
  exibicaoSalva: ExibicaoDoCardapio,
  temArquivo: boolean
): boolean {
  return (
    parte.campos.some((c) => form[c] !== salvo[c])
    || parte.exibicao.some((c) => exibicao[c] !== exibicaoSalva[c])
    || Boolean(parte.arquivos && temArquivo)
  );
}
