/**
 * Desenhos da Exibição do cardápio — miniaturas do que cada opção faz na
 * vitrine, com a foto e o logo DE VERDADE da loja quando houver.
 *
 * São esquemas, não uma segunda vitrine: o resultado fiel é a prévia ao lado
 * (iframe da página real). O desenho só precisa deixar óbvia a diferença
 * entre as opções antes do clique.
 */
import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import type {
  AlinhamentoDoLogo,
  EncaixeDaFoto,
  FormatoDaFoto,
  FormatoDoLogo,
  PosicaoDaFoto,
} from '../../services/exibicaoDoCardapio';

const PROPORCAO: Record<Exclude<FormatoDaFoto, 'padrao'>, string> = {
  quadrada: '1 / 1',
  retangular: '4 / 3',
  paisagem: '16 / 9',
};

/** Foto do produto; sem foto, um bloco na cor da marca. */
export const Foto: React.FC<{ src?: string; encaixe?: EncaixeDaFoto; className?: string; style?: React.CSSProperties }> = ({
  src,
  encaixe = 'cortar',
  className,
  style,
}) => (
  <span className={cn('block overflow-hidden bg-brand-soft', className)} style={style}>
    {src ? (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn('block h-full w-full', encaixe === 'inteira' ? 'object-contain bg-surface' : 'object-cover')}
      />
    ) : (
      <span className="block h-full w-full bg-gradient-to-br from-brand-soft to-surface-2" />
    )}
  </span>
);

const Linha: React.FC<{ largura: string; forte?: boolean }> = ({ largura, forte }) => (
  <span
    className={cn('block h-1.5 rounded-full', forte ? 'bg-fg-muted-token' : 'bg-border-strong-token')}
    style={{ width: largura }}
  />
);

/** Selo pequeno no canto: "quem decide é o template". */
const DoTemplate: React.FC = () => (
  <span className="absolute right-1 top-1 rounded-full bg-surface p-0.5 text-brand-ink shadow-repouso">
    <SparklesIcon className="h-3 w-3" />
  </span>
);

/** Cartão de produto em miniatura: posição e formato da foto. */
export const MiniCartao: React.FC<{
  posicao: PosicaoDaFoto;
  foto?: string;
  formato?: FormatoDaFoto;
  encaixe?: EncaixeDaFoto;
  doTemplate?: boolean;
}> = ({ posicao, foto, formato = 'padrao', encaixe, doTemplate }) => {
  const aoLado = posicao === 'esquerda' || posicao === 'direita';
  const proporcao = formato === 'padrao' ? '4 / 3' : PROPORCAO[formato];
  return (
    <span className="relative flex">
      <span
        className={cn(
          'flex overflow-hidden rounded-md bg-surface shadow-repouso',
          aoLado ? 'w-24 items-center gap-1.5 p-1.5' : 'w-16 flex-col',
          posicao === 'direita' && 'flex-row-reverse'
        )}
      >
        <Foto
          src={foto}
          encaixe={encaixe}
          className={aoLado ? 'h-8 w-8 shrink-0 rounded' : 'w-full'}
          style={aoLado ? undefined : { aspectRatio: proporcao }}
        />
        <span className={cn('flex min-w-0 flex-1 flex-col gap-1', !aoLado && 'p-1.5')}>
          <Linha largura="80%" forte />
          <Linha largura="95%" />
          <span className="mt-0.5 block h-2 w-7 rounded-full bg-brand" />
        </span>
      </span>
      {doTemplate && <DoTemplate />}
    </span>
  );
};

/** Moldura da foto num formato (1:1, 4:3, 16:9) com a foto real. */
export const MolduraDaFoto: React.FC<{ formato: FormatoDaFoto; foto?: string; encaixe?: EncaixeDaFoto }> = ({
  formato,
  foto,
  encaixe,
}) => (
  <span className="relative flex">
    <Foto
      src={foto}
      encaixe={encaixe}
      className="w-20 rounded-md shadow-repouso"
      style={{ aspectRatio: formato === 'padrao' ? '4 / 3' : PROPORCAO[formato] }}
    />
    {formato === 'padrao' && <DoTemplate />}
  </span>
);

/**
 * A mesma foto em "Cortar" (preenche) ou "Inteira" (cabe toda). Quadro
 * deitado de propósito: foto de prato é quase sempre quadrada, e num quadro
 * quadrado as duas opções sairiam iguais no desenho.
 */
export const EncaixeDesenho: React.FC<{ encaixe: EncaixeDaFoto; foto?: string }> = ({ encaixe, foto }) => (
  <Foto src={foto} encaixe={encaixe} className="h-16 w-32 rounded-md border border-border-token shadow-repouso" />
);

/** O logo real da loja na forma escolhida. */
export const LogoDesenho: React.FC<{ formato: FormatoDoLogo; logo?: string; nome?: string }> = ({ formato, logo, nome }) => (
  <span className="relative flex">
    <span
      className={cn(
        'flex h-14 w-14 items-center justify-center overflow-hidden bg-surface shadow-repouso',
        formato === 'redondo' ? 'rounded-full' : formato === 'quadrado' ? 'rounded-md' : 'rounded-xl'
      )}
    >
      {logo ? (
        <img src={logo} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-lead font-semibold text-brand-ink">{(nome || 'L').charAt(0).toUpperCase()}</span>
      )}
    </span>
    {formato === 'padrao' && <DoTemplate />}
  </span>
);

/** Topo da loja em miniatura: logo ao lado do nome ou em cima dele. */
export const TopoDesenho: React.FC<{ alinhamento: AlinhamentoDoLogo; logo?: string; formato?: FormatoDoLogo }> = ({
  alinhamento,
  logo,
  formato = 'padrao',
}) => {
  const centro = alinhamento === 'centro';
  const redondo = formato === 'redondo';
  return (
    <span className="relative flex">
      <span
        className={cn(
          'flex w-28 gap-1.5 rounded-md bg-surface p-2 shadow-repouso',
          centro ? 'flex-col items-center' : 'items-center'
        )}
      >
        <span className={cn('block h-7 w-7 shrink-0 overflow-hidden bg-brand-soft', redondo ? 'rounded-full' : 'rounded')}>
          {logo && <img src={logo} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </span>
        <span className={cn('flex flex-1 flex-col gap-1', centro && 'w-full items-center')}>
          <Linha largura="70%" forte />
          <Linha largura="90%" />
        </span>
      </span>
      {alinhamento === 'padrao' && <DoTemplate />}
    </span>
  );
};

/** A descrição real cortada no limite, como o cliente vai ler. */
export const DescricaoDesenho: React.FC<{ nome?: string; texto: string; cortou: boolean; automatico?: boolean }> = ({
  nome,
  texto,
  cortou,
  automatico,
}) => (
  <span className="flex h-full min-h-0 w-full flex-col gap-1 overflow-hidden bg-surface p-2 text-left">
    {nome && <span className="shrink-0 truncate text-badge font-semibold text-fg-token">{nome}</span>}
    <span className={cn('min-h-0 overflow-hidden text-badge leading-snug text-fg-muted-token', automatico && 'line-clamp-2')}>
      {texto}
      {cortou && <span className="ml-1 font-semibold text-brand-ink underline">ver mais</span>}
    </span>
  </span>
);
