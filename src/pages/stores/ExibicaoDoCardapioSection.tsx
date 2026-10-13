import React, { useState } from 'react';
import {
  ArchiveBoxIcon,
  ArrowPathRoundedSquareIcon,
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import { EscolhaVisual, Input, NumberField, Secao, Switch } from '../../components/ui';
import { cn } from '../../utils/cn';
import type { AreaDaPrevia } from '../../hooks/usePreviaAoVivo';
import {
  resumirDescricao,
  type AlinhamentoDoLogo,
  type AmostraDoCardapio,
  type EncaixeDaFoto,
  type ExibicaoDoCardapio,
  type FormatoDaFoto,
  type FormatoDoLogo,
  type PosicaoDaFoto,
} from '../../services/exibicaoDoCardapio';
import {
  DescricaoDesenho,
  EncaixeDesenho,
  LogoDesenho,
  MiniCartao,
  MolduraDaFoto,
  TopoDesenho,
} from './desenhosDaExibicao';

interface Props {
  /** Rascunho — o que está na tela e na prévia. */
  valor: ExibicaoDoCardapio;
  /** O que está salvo: o que difere ganha um ponto. */
  gravado: ExibicaoDoCardapio;
  onMudar: (parcial: Partial<ExibicaoDoCardapio>) => void;
  /** Acende na prévia a parte da vitrine que esta opção muda. */
  onFocar?: (area: AreaDaPrevia) => void;
  /** Um produto real da loja para os desenhos. */
  amostra?: AmostraDoCardapio | null;
  logoUrl?: string;
  nomeDaLoja?: string;
}

type Parte = 'cartao' | 'topo' | 'estoque' | 'pedido';

const PARTES: { id: Parte; rotulo: string; icone: React.ComponentType<{ className?: string }>; area?: AreaDaPrevia }[] = [
  { id: 'cartao', rotulo: 'Cartão', icone: Squares2X2Icon, area: 'cartao' },
  { id: 'topo', rotulo: 'Topo', icone: BuildingStorefrontIcon, area: 'topo' },
  { id: 'estoque', rotulo: 'Estoque', icone: ArchiveBoxIcon, area: 'estoque' },
  { id: 'pedido', rotulo: 'Pedido feito', icone: CheckBadgeIcon },
];

const CAMPOS_DA_PARTE: Record<Parte, (keyof ExibicaoDoCardapio)[]> = {
  cartao: ['foto_posicao', 'foto_proporcao', 'foto_encaixe', 'descricao_limite'],
  topo: ['logo_formato', 'logo_alinhamento'],
  estoque: ['mostrar_estoque_baixo', 'mostrar_esgotados', 'mostrar_peca_novamente'],
  pedido: ['agradecimento_titulo', 'agradecimento_subtitulo'],
};

const TAMANHOS_DA_DESCRICAO = [
  { valor: 0, titulo: 'Automático', dica: 'Corta em 2 linhas' },
  { valor: 60, titulo: 'Curta' },
  { valor: 120, titulo: 'Média' },
  { valor: 200, titulo: 'Longa' },
];

const DESCRICAO_DE_EXEMPLO = 'Folhas frescas, proteína grelhada na hora, legumes da estação e molho da casa à parte.';

/**
 * Exibição do cardápio — como o produto aparece na vitrine.
 *
 * Controlada: o rascunho mora na página, que o manda para a prévia ao vivo e
 * grava tudo com uma barra só. Aqui cada opção é um desenho com o produto e o
 * logo de verdade da loja, separado pela parte da vitrine que muda.
 */
export const ExibicaoDoCardapioSection: React.FC<Props> = ({
  valor,
  gravado,
  onMudar,
  onFocar,
  amostra,
  logoUrl,
  nomeDaLoja,
}) => {
  const [parte, setParte] = useState<Parte>('cartao');
  const foto = amostra?.foto || undefined;
  const mudou = (campo: keyof ExibicaoDoCardapio) => valor[campo] !== gravado[campo];

  const area = PARTES.find((p) => p.id === parte)?.area;
  const mudar = (parcial: Partial<ExibicaoDoCardapio>) => {
    onMudar(parcial);
    if (area) onFocar?.(area);
  };

  const irPara = (p: (typeof PARTES)[number]) => {
    setParte(p.id);
    if (p.area) onFocar?.(p.area);
  };

  // "Ver mais": cada tamanho mostra a descrição real cortada nele.
  const textoDaAmostra = amostra?.descricao || DESCRICAO_DE_EXEMPLO;
  const tamanhos = TAMANHOS_DA_DESCRICAO.some((t) => t.valor === valor.descricao_limite)
    ? TAMANHOS_DA_DESCRICAO
    : [...TAMANHOS_DA_DESCRICAO, { valor: valor.descricao_limite, titulo: `${valor.descricao_limite} letras` }];
  const desenhoDaDescricao = (limite: number) => {
    const r = resumirDescricao(textoDaAmostra, limite);
    return (
      <DescricaoDesenho
        nome={amostra?.nome}
        texto={r ? r.texto : textoDaAmostra}
        cortou={r ? r.cortou : false}
        automatico={!r}
      />
    );
  };

  const posicoes: { valor: PosicaoDaFoto; titulo: string; dica: string }[] = [
    { valor: 'padrao', titulo: 'Do template', dica: 'Como o template desenha' },
    { valor: 'topo', titulo: 'Em cima', dica: 'Foto grande, texto embaixo' },
    { valor: 'esquerda', titulo: 'À esquerda', dica: 'Lista com a foto ao lado' },
    { valor: 'direita', titulo: 'À direita', dica: 'Lista estilo iFood' },
  ];
  const formatos: { valor: FormatoDaFoto; titulo: string }[] = [
    { valor: 'padrao', titulo: 'Do template' },
    { valor: 'quadrada', titulo: 'Quadrada' },
    { valor: 'retangular', titulo: 'Retangular' },
    { valor: 'paisagem', titulo: 'Paisagem' },
  ];
  const encaixes: { valor: EncaixeDaFoto; titulo: string; dica: string }[] = [
    { valor: 'cortar', titulo: 'Cortar', dica: 'Preenche o quadro e apara as bordas' },
    { valor: 'inteira', titulo: 'Inteira', dica: 'A foto toda, sem cortar' },
  ];
  const formatosDoLogo: { valor: FormatoDoLogo; titulo: string }[] = [
    { valor: 'padrao', titulo: 'Do template' },
    { valor: 'redondo', titulo: 'Redondo' },
    { valor: 'quadrado', titulo: 'Quadrado' },
  ];
  const alinhamentos: { valor: AlinhamentoDoLogo; titulo: string; dica: string }[] = [
    { valor: 'padrao', titulo: 'Do template', dica: 'Como o template desenha' },
    { valor: 'esquerda', titulo: 'Ao lado', dica: 'Logo ao lado do nome' },
    { valor: 'centro', titulo: 'Centralizado', dica: 'Logo em cima do nome' },
  ];

  const interruptores: {
    campo: 'mostrar_estoque_baixo' | 'mostrar_esgotados' | 'mostrar_peca_novamente';
    rotulo: string;
    amostra: React.ReactNode;
  }[] = [
    {
      campo: 'mostrar_estoque_baixo',
      rotulo: 'Avisar estoque baixo',
      amostra: <span className="rounded-full bg-warning-soft px-2 py-0.5 text-badge font-semibold text-warning-token">Últimas unidades</span>,
    },
    {
      campo: 'mostrar_esgotados',
      rotulo: 'Mostrar esgotados',
      amostra: (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-badge font-semibold text-fg-muted-token">
          <NoSymbolIcon className="h-3 w-3" /> Esgotado
        </span>
      ),
    },
    {
      campo: 'mostrar_peca_novamente',
      rotulo: 'Peça novamente',
      amostra: (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-badge font-semibold text-brand-ink">
          <ArrowPathRoundedSquareIcon className="h-3 w-3" /> Peça novamente
        </span>
      ),
    },
  ];

  const tituloDoAgradecimento = valor.agradecimento_titulo.trim() || 'Pedido confirmado!';
  const subtituloDoAgradecimento = valor.agradecimento_subtitulo.trim() || 'Seu pedido foi processado com sucesso.';

  return (
    <Secao titulo="Exibição do cardápio">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1" role="group" aria-label="Parte da vitrine">
          {PARTES.map((p) => {
            const Icone = p.icone;
            const ativa = p.id === parte;
            const pendente = CAMPOS_DA_PARTE[p.id].some(mudou);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => irPara(p)}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-body font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  ativa ? 'bg-surface text-fg-token shadow-repouso' : 'text-fg-muted-token hover:text-fg-token'
                )}
              >
                <Icone className="h-4 w-4" />
                {p.rotulo}
                {pendente && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />}
              </button>
            );
          })}
        </div>

        {parte === 'cartao' && (
          <div className="flex flex-col gap-5">
            <EscolhaVisual
              rotulo="Posição da foto"
              valor={valor.foto_posicao}
              mudou={mudou('foto_posicao')}
              onChange={(v) => mudar({ foto_posicao: v })}
              opcoes={posicoes.map((o) => ({
                ...o,
                desenho: (
                  <MiniCartao
                    posicao={o.valor === 'padrao' ? 'topo' : o.valor}
                    doTemplate={o.valor === 'padrao'}
                    foto={foto}
                    formato={valor.foto_proporcao}
                    encaixe={valor.foto_encaixe}
                  />
                ),
              }))}
            />
            <EscolhaVisual
              rotulo="Formato da foto"
              valor={valor.foto_proporcao}
              mudou={mudou('foto_proporcao')}
              onChange={(v) => mudar({ foto_proporcao: v })}
              opcoes={formatos.map((o) => ({
                ...o,
                desenho: <MolduraDaFoto formato={o.valor} foto={foto} encaixe={valor.foto_encaixe} />,
              }))}
            />
            <EscolhaVisual
              rotulo="Encaixe da foto"
              colunas={2}
              valor={valor.foto_encaixe}
              mudou={mudou('foto_encaixe')}
              onChange={(v) => mudar({ foto_encaixe: v })}
              opcoes={encaixes.map((o) => ({ ...o, desenho: <EncaixeDesenho encaixe={o.valor} foto={foto} /> }))}
            />
            <div className="flex flex-col gap-3">
              <EscolhaVisual
                rotulo="Descrição no cartão"
                valor={String(valor.descricao_limite)}
                mudou={mudou('descricao_limite')}
                onChange={(v) => mudar({ descricao_limite: Number(v) })}
                colunas={4}
                desenhoAlto
                opcoes={tamanhos.map((t) => ({
                  valor: String(t.valor),
                  titulo: t.titulo,
                  dica: 'dica' in t ? t.dica : `“ver mais” a partir de ${t.valor} letras`,
                  desenho: desenhoDaDescricao(t.valor),
                }))}
              />
              <NumberField
                rotulo="Ver mais a partir de"
                valor={valor.descricao_limite}
                onMudar={(n) => mudar({ descricao_limite: n })}
                min={0}
                max={500}
                sufixo={valor.descricao_limite === 0 ? 'automático' : 'letras'}
              />
            </div>
          </div>
        )}

        {parte === 'topo' && (
          <div className="flex flex-col gap-5">
            <EscolhaVisual
              rotulo="Formato do logo"
              colunas={3}
              valor={valor.logo_formato}
              mudou={mudou('logo_formato')}
              onChange={(v) => mudar({ logo_formato: v })}
              opcoes={formatosDoLogo.map((o) => ({
                ...o,
                desenho: <LogoDesenho formato={o.valor} logo={logoUrl} nome={nomeDaLoja} />,
              }))}
            />
            <EscolhaVisual
              rotulo="Logo e nome"
              colunas={3}
              valor={valor.logo_alinhamento}
              mudou={mudou('logo_alinhamento')}
              onChange={(v) => mudar({ logo_alinhamento: v })}
              opcoes={alinhamentos.map((o) => ({
                ...o,
                desenho: <TopoDesenho alinhamento={o.valor} logo={logoUrl} formato={valor.logo_formato} />,
              }))}
            />
          </div>
        )}

        {parte === 'estoque' && (
          <ul className="flex flex-col divide-y divide-border-token">
            {interruptores.map((i) => (
              <li key={i.campo} className="flex items-center justify-between gap-4 py-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <span className="text-body font-semibold text-fg-token">{i.rotulo}</span>
                  <span aria-hidden className={cn(!valor[i.campo] && 'opacity-40 line-through')}>{i.amostra}</span>
                  {mudou(i.campo) && (
                    <span className="inline-block h-2 w-2 rounded-full bg-brand" aria-label="Alterado, ainda não salvo" />
                  )}
                </span>
                <Switch ligado={valor[i.campo]} rotulo={i.rotulo} onMudar={(v) => mudar({ [i.campo]: v })} />
              </li>
            ))}
          </ul>
        )}

        {parte === 'pedido' && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Input
                label={`Título (${valor.agradecimento_titulo.length}/60)`}
                value={valor.agradecimento_titulo}
                maxLength={60}
                placeholder="Pedido confirmado!"
                onChange={(e) => mudar({ agradecimento_titulo: e.target.value })}
              />
              <Input
                label={`Mensagem (${valor.agradecimento_subtitulo.length}/160)`}
                value={valor.agradecimento_subtitulo}
                maxLength={160}
                placeholder="Seu pedido foi processado com sucesso."
                onChange={(e) => mudar({ agradecimento_subtitulo: e.target.value })}
              />
            </div>
            {/* A tela de pedido feito não cabe na prévia (precisa de um pedido
                de verdade): o texto aparece aqui, no lugar onde o cliente lê. */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-2 p-5 text-center" aria-label="Tela de pedido feito">
              <CheckCircleIcon className="h-10 w-10 text-success-token" aria-hidden />
              <p className="text-lead font-semibold text-fg-token">{tituloDoAgradecimento}</p>
              <p className="text-caption text-fg-muted-token">{subtituloDoAgradecimento}</p>
            </div>
          </div>
        )}
      </div>
    </Secao>
  );
};

export default ExibicaoDoCardapioSection;
