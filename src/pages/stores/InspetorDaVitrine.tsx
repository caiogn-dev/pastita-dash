/**
 * Painel de propriedades do editor do Storefront — a coluna da direita.
 *
 * Uma parte da vitrine por vez (escolhida na lista à esquerda ou clicando na
 * própria prévia), em linhas curtas: rótulo em cima, controle compacto
 * embaixo. O resultado não é desenhado aqui — ele aparece na vitrine de
 * verdade, no meio da tela, a cada clique.
 */
import React from 'react';
import {
  ArrowPathRoundedSquareIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PhotoIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { Deslizador, Input, Propriedade, Segmentado, Switch } from '../../components/ui';
import { cn } from '../../utils/cn';
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
import type { TemplateDoCardapio } from './templatesDoCardapio';
import BannersSection from './BannersSection';
import type { FormDaVitrine, Parte } from './partesDaVitrine';
import {
  FotoADireita,
  FotoAEsquerda,
  FotoEmCima,
  LogoAoLado,
  LogoNoCentro,
  LogoQuadrado,
  LogoRedondo,
} from './glifosDaVitrine';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const auto = <SparklesIcon className="h-4 w-4" />;

interface Imagem {
  url: string;
  /** Escolhida aqui e ainda não enviada. */
  pendente: boolean;
  onEscolher: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemover: () => void;
}

export interface InspetorDaVitrineProps {
  parte: Parte;
  form: FormDaVitrine;
  formSalvo: FormDaVitrine;
  mudarForm: (parcial: Partial<FormDaVitrine>) => void;
  exibicao: ExibicaoDoCardapio;
  exibicaoSalva: ExibicaoDoCardapio;
  mudarExibicao: (parcial: Partial<ExibicaoDoCardapio>) => void;
  templates: TemplateDoCardapio[];
  loja: { id?: string; slug?: string; name?: string; logo_url?: string | null; banner_url?: string | null };
  logo: Imagem;
  capa: Imagem;
  amostra?: AmostraDoCardapio | null;
  urlPublica?: string | null;
  /** Banner enviado/apagado: a prévia precisa recarregar para buscar. */
  onBannersMudaram?: () => void;
}

const POSICOES: { valor: PosicaoDaFoto; rotulo: string; icone: React.ReactNode; dica?: string }[] = [
  { valor: 'padrao', rotulo: 'Auto', icone: auto, dica: 'Como o template desenha' },
  { valor: 'topo', rotulo: 'Em cima', icone: <FotoEmCima /> },
  { valor: 'esquerda', rotulo: 'Esquerda', icone: <FotoAEsquerda /> },
  { valor: 'direita', rotulo: 'Direita', icone: <FotoADireita />, dica: 'Lista estilo iFood' },
];
const FORMATOS: { valor: FormatoDaFoto; rotulo: string; icone?: React.ReactNode; dica?: string }[] = [
  { valor: 'padrao', rotulo: 'Auto', icone: auto, dica: 'Como o template desenha' },
  { valor: 'quadrada', rotulo: '1:1' },
  { valor: 'retangular', rotulo: '4:3' },
  { valor: 'paisagem', rotulo: '16:9' },
];
const ENCAIXES: { valor: EncaixeDaFoto; rotulo: string; icone: React.ReactNode; dica: string }[] = [
  { valor: 'cortar', rotulo: 'Cortar', icone: <ArrowsPointingOutIcon className="h-4 w-4" />, dica: 'Preenche o quadro e apara as bordas' },
  { valor: 'inteira', rotulo: 'Inteira', icone: <ArrowsPointingInIcon className="h-4 w-4" />, dica: 'A foto toda, sem cortar' },
];
const FORMATOS_DO_LOGO: { valor: FormatoDoLogo; rotulo: string; icone: React.ReactNode; dica?: string }[] = [
  { valor: 'padrao', rotulo: 'Auto', icone: auto, dica: 'Como o template desenha' },
  { valor: 'redondo', rotulo: 'Redondo', icone: <LogoRedondo /> },
  { valor: 'quadrado', rotulo: 'Quadrado', icone: <LogoQuadrado /> },
];
const ALINHAMENTOS: { valor: AlinhamentoDoLogo; rotulo: string; icone: React.ReactNode; dica?: string }[] = [
  { valor: 'padrao', rotulo: 'Auto', icone: auto, dica: 'Como o template desenha' },
  { valor: 'esquerda', rotulo: 'Ao lado', icone: <LogoAoLado />, dica: 'Logo ao lado do nome' },
  { valor: 'centro', rotulo: 'No centro', icone: <LogoNoCentro />, dica: 'Logo em cima do nome' },
];

const textoDoLimite = (n: number) => (n === 0 ? 'Automático' : `${n} letras`);

/** Troca de imagem: a própria miniatura é o botão. */
const TrocaDeImagem: React.FC<{
  imagem: Imagem;
  alt: string;
  rotuloDoBotao: string;
  className: string;
  vazio: React.ReactNode;
}> = ({ imagem, alt, rotuloDoBotao, className, vazio }) => (
  <label className={cn('group relative block cursor-pointer overflow-hidden bg-surface-2', className)} title={rotuloDoBotao}>
    {imagem.url ? (
      <img src={imagem.url} alt={alt} className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center text-fg-muted-token">{vazio}</span>
    )}
    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <ArrowUpTrayIcon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
    </span>
    <input type="file" accept="image/*" className="sr-only" aria-label={rotuloDoBotao} onChange={imagem.onEscolher} />
  </label>
);

const CampoDeCor: React.FC<{ rotulo: string; valor: string; onMudar: (v: string) => void }> = ({ rotulo, valor, onMudar }) => (
  <div className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 p-1.5">
    <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-repouso" style={{ background: HEX.test(valor) ? valor : 'transparent' }} title={rotulo}>
      <input type="color" aria-label={rotulo} value={HEX.test(valor) ? valor : '#000000'} onChange={(e) => onMudar(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
    <div className="min-w-0 flex-1">
      <span className="block text-caption text-fg-muted-token">{rotulo}</span>
      <input
        type="text"
        aria-label={`${rotulo} (código)`}
        value={valor}
        maxLength={7}
        onChange={(e) => onMudar(e.target.value)}
        className={cn(
          'w-full bg-transparent font-mono text-body text-fg-token focus:outline-none',
          !HEX.test(valor) && 'text-danger-token'
        )}
      />
    </div>
  </div>
);

export const InspetorDaVitrine: React.FC<InspetorDaVitrineProps> = (p) => {
  const { form, formSalvo, exibicao, exibicaoSalva, mudarForm, mudarExibicao } = p;
  const mudouExib = (c: keyof ExibicaoDoCardapio) => exibicao[c] !== exibicaoSalva[c];
  const mudouForm = (c: keyof FormDaVitrine) => form[c] !== formSalvo[c];

  if (p.parte === 'topo') {
    const redondo = exibicao.logo_formato === 'redondo';
    return (
      <div className="flex flex-col gap-5">
        <Propriedade rotulo="Capa" mudou={p.capa.pendente} valor={p.capa.pendente ? <button type="button" onClick={p.capa.onRemover} className="text-caption text-fg-muted-token hover:text-danger-token">Desfazer</button> : <span className="text-caption text-fg-muted-token">1920 × 600 px</span>}>
          <TrocaDeImagem imagem={p.capa} alt="Capa" rotuloDoBotao="Trocar capa" className="aspect-[3/1] w-full rounded-lg" vazio={<PhotoIcon className="h-6 w-6" />} />
        </Propriedade>
        <Propriedade rotulo="Logo" mudou={p.logo.pendente} valor={p.logo.pendente ? <button type="button" onClick={p.logo.onRemover} className="text-caption text-fg-muted-token hover:text-danger-token">Desfazer</button> : undefined}>
          <div className="flex items-center gap-3">
            <TrocaDeImagem
              imagem={p.logo}
              alt="Logo"
              rotuloDoBotao="Trocar logo"
              className={cn('h-16 w-16 shrink-0 shadow-repouso', redondo ? 'rounded-full' : 'rounded-xl')}
              vazio={<span className="text-lead font-semibold">{(p.loja.name || 'L').charAt(0)}</span>}
            />
            <span className="min-w-0 truncate text-body font-semibold text-fg-token">{p.loja.name}</span>
          </div>
        </Propriedade>
        <Propriedade rotulo="Formato do logo" mudou={mudouExib('logo_formato')}>
          <Segmentado rotulo="Formato do logo" empilhado opcoes={FORMATOS_DO_LOGO} valor={exibicao.logo_formato} onChange={(v) => mudarExibicao({ logo_formato: v })} />
        </Propriedade>
        <Propriedade rotulo="Logo e nome" mudou={mudouExib('logo_alinhamento')}>
          <Segmentado rotulo="Logo e nome" empilhado opcoes={ALINHAMENTOS} valor={exibicao.logo_alinhamento} onChange={(v) => mudarExibicao({ logo_alinhamento: v })} />
        </Propriedade>
        <Propriedade rotulo="Frase" mudou={mudouForm('tagline')} valor={`${form.tagline.length}/200`}>
          <Input aria-label="Frase do topo" value={form.tagline} maxLength={200} placeholder="Ex: Saladas frescas todo dia" onChange={(e) => mudarForm({ tagline: e.target.value })} />
        </Propriedade>
      </div>
    );
  }

  if (p.parte === 'estilo') {
    return (
      <div className="flex flex-col gap-5">
        <Propriedade rotulo="Modelo" mudou={mudouForm('template')}>
          <div role="radiogroup" aria-label="Modelo" className="grid grid-cols-2 gap-2">
            {p.templates.map((t) => {
              const escolhido = form.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={escolhido}
                  title={t.description}
                  onClick={() => mudarForm({ template: t.id })}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    escolhido ? 'border-brand bg-brand-soft' : 'border-border-token hover:bg-surface-2'
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden>{t.preview}</span>
                  <span className={cn('truncate text-body font-semibold', escolhido ? 'text-brand-ink' : 'text-fg-token')}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </Propriedade>
        <Propriedade rotulo="Cores" mudou={mudouForm('primary_color') || mudouForm('secondary_color')}>
          <div className="grid grid-cols-2 gap-2">
            <CampoDeCor rotulo="Cor principal" valor={form.primary_color} onMudar={(v) => mudarForm({ primary_color: v })} />
            <CampoDeCor rotulo="Cor de destaque" valor={form.secondary_color} onMudar={(v) => mudarForm({ secondary_color: v })} />
          </div>
        </Propriedade>
      </div>
    );
  }

  if (p.parte === 'banners') {
    return p.loja.id ? <BannersSection storeId={p.loja.id} embutida onMudou={p.onBannersMudaram} /> : null;
  }

  if (p.parte === 'cartao') {
    const texto = p.amostra?.descricao || 'Folhas frescas, proteína grelhada na hora, legumes da estação e molho da casa à parte.';
    const resumo = resumirDescricao(texto, exibicao.descricao_limite);
    return (
      <div className="flex flex-col gap-5">
        <Propriedade rotulo="Posição da foto" mudou={mudouExib('foto_posicao')}>
          <Segmentado rotulo="Posição da foto" empilhado opcoes={POSICOES} valor={exibicao.foto_posicao} onChange={(v) => mudarExibicao({ foto_posicao: v })} />
        </Propriedade>
        <Propriedade rotulo="Formato da foto" mudou={mudouExib('foto_proporcao')}>
          <Segmentado rotulo="Formato da foto" opcoes={FORMATOS} valor={exibicao.foto_proporcao} onChange={(v) => mudarExibicao({ foto_proporcao: v })} />
        </Propriedade>
        <Propriedade rotulo="Encaixe da foto" mudou={mudouExib('foto_encaixe')}>
          <Segmentado rotulo="Encaixe da foto" opcoes={ENCAIXES} valor={exibicao.foto_encaixe} onChange={(v) => mudarExibicao({ foto_encaixe: v })} />
        </Propriedade>
        <Propriedade rotulo="Descrição no cartão" mudou={mudouExib('descricao_limite')}>
          <Deslizador
            rotulo="Descrição no cartão"
            valor={exibicao.descricao_limite}
            min={0}
            max={300}
            passo={10}
            formatar={textoDoLimite}
            onMudar={(n) => mudarExibicao({ descricao_limite: n })}
          />
          <div data-testid="amostra-da-descricao" className="rounded-lg bg-surface-2 p-3">
            {p.amostra?.nome && <p className="truncate text-caption font-semibold text-fg-token">{p.amostra.nome}</p>}
            <p className={cn('text-caption text-fg-muted-token', !resumo && 'line-clamp-2')}>
              {resumo ? resumo.texto : texto}
              {resumo?.cortou && <span className="ml-1 font-semibold text-brand-ink underline">ver mais</span>}
            </p>
          </div>
        </Propriedade>
      </div>
    );
  }

  if (p.parte === 'estoque') {
    const linhas: { campo: 'mostrar_estoque_baixo' | 'mostrar_esgotados' | 'mostrar_peca_novamente'; rotulo: string; icone: React.ReactNode }[] = [
      { campo: 'mostrar_estoque_baixo', rotulo: 'Avisar estoque baixo', icone: <ExclamationTriangleIcon className="h-4 w-4" /> },
      { campo: 'mostrar_esgotados', rotulo: 'Mostrar esgotados', icone: <NoSymbolIcon className="h-4 w-4" /> },
      { campo: 'mostrar_peca_novamente', rotulo: 'Peça novamente', icone: <ArrowPathRoundedSquareIcon className="h-4 w-4" /> },
    ];
    return (
      <ul className="flex flex-col divide-y divide-border-token">
        {linhas.map((l) => (
          <li key={l.campo} className="flex items-center justify-between gap-3 py-3 first:pt-0">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', exibicao[l.campo] ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-fg-muted-token')} aria-hidden>
                {l.icone}
              </span>
              <span className="truncate text-body font-semibold text-fg-token">{l.rotulo}</span>
              {mudouExib(l.campo) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Alterado, ainda não salvo" />}
            </span>
            <Switch ligado={exibicao[l.campo]} rotulo={l.rotulo} onMudar={(v) => mudarExibicao({ [l.campo]: v })} />
          </li>
        ))}
      </ul>
    );
  }

  if (p.parte === 'pedido') {
    return (
      <div className="flex flex-col gap-5">
        <Propriedade rotulo="Título" mudou={mudouExib('agradecimento_titulo')} valor={`${exibicao.agradecimento_titulo.length}/60`}>
          <Input aria-label="Título" value={exibicao.agradecimento_titulo} maxLength={60} placeholder="Pedido confirmado!" onChange={(e) => mudarExibicao({ agradecimento_titulo: e.target.value })} />
        </Propriedade>
        <Propriedade rotulo="Mensagem" mudou={mudouExib('agradecimento_subtitulo')} valor={`${exibicao.agradecimento_subtitulo.length}/160`}>
          <Input aria-label="Mensagem" value={exibicao.agradecimento_subtitulo} maxLength={160} placeholder="Seu pedido foi processado com sucesso." onChange={(e) => mudarExibicao({ agradecimento_subtitulo: e.target.value })} />
        </Propriedade>
      </div>
    );
  }

  // endereço
  return (
    <div className="flex flex-col gap-5">
      <Propriedade rotulo="Domínio próprio" mudou={mudouForm('custom_domain')}>
        <Input aria-label="Domínio próprio" value={form.custom_domain} placeholder="loja.com.br" onChange={(e) => mudarForm({ custom_domain: e.target.value })} />
      </Propriedade>
      {p.urlPublica && (
        <Propriedade rotulo="Endereço público">
          <div className="flex items-center gap-1 rounded-lg bg-surface-2 py-1 pl-3 pr-1">
            <code className="min-w-0 flex-1 truncate text-caption text-fg-token">{p.urlPublica}</code>
            <button
              type="button"
              title="Copiar"
              aria-label="Copiar endereço"
              onClick={() => void navigator.clipboard?.writeText(p.urlPublica || '')}
              className="rounded-md p-1.5 text-fg-muted-token hover:bg-surface hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
            <a
              href={p.urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir"
              aria-label="Abrir endereço"
              className="rounded-md p-1.5 text-fg-muted-token hover:bg-surface hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </Propriedade>
      )}
    </div>
  );
};

export default InspetorDaVitrine;
