/**
 * Partes da vitrine — a coluna da esquerda do editor da Aparência da loja.
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
  /** Título do bloco que começa neste item (Marca, Cardápio…). */
  grupo?: string;
}

export const PARTES: DefinicaoDaParte[] = [
  { id: 'topo', rotulo: 'Logo e capa', icone: BuildingStorefrontIcon, area: 'topo', campos: ['tagline'], exibicao: ['logo_formato', 'logo_alinhamento'], arquivos: true, grupo: 'Marca' },
  { id: 'estilo', rotulo: 'Cores e modelo', icone: SwatchIcon, area: 'topo', campos: ['template', 'primary_color', 'secondary_color'], exibicao: [] },
  { id: 'banners', rotulo: 'Banners de promoção', icone: RectangleGroupIcon, area: 'banners', campos: [], exibicao: [], grupo: 'Cardápio' },
  { id: 'cartao', rotulo: 'Como o prato aparece', icone: Squares2X2Icon, area: 'cartao', campos: [], exibicao: ['foto_posicao', 'foto_proporcao', 'foto_encaixe', 'descricao_limite'] },
  { id: 'estoque', rotulo: 'Esgotados e estoque', icone: ArchiveBoxIcon, area: 'estoque', campos: [], exibicao: ['mostrar_estoque_baixo', 'mostrar_esgotados', 'mostrar_peca_novamente'] },
  { id: 'pedido', rotulo: 'Mensagem de confirmação', icone: CheckBadgeIcon, campos: [], exibicao: ['agradecimento_titulo', 'agradecimento_subtitulo'], grupo: 'Depois do pedido' },
  { id: 'endereco', rotulo: 'Link da loja', icone: GlobeAltIcon, campos: ['custom_domain'], exibicao: [] },
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
