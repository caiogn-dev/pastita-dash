/**
 * Painel de propriedades do editor da bio — a coluna da direita.
 *
 * Uma parte por vez. Nada aqui grava: tudo mexe no rascunho da página, e a
 * `BarraDeAlteracoes` é o único salvar. Só criar, excluir e reordenar links
 * continuam imediatos — são ações sobre a lista, não edição de um campo.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { Badge, Button, Campo, EmptyState, Input, Propriedade, RowActions, Switch } from '../../components/ui';
import { Loading } from '../../components/common';
import { TimeSeriesChart } from '../../components/reports/TimeSeriesChart';
import { RankBarList } from '../../components/reports/RankBarList';
import type { BioLink, BioStats } from '../../services/bioApi';
import { cn } from '../../utils/cn';
import type { ParteDaBio } from './partesDaBio';

export interface BioLinksToggles {
  menu?: boolean;
  whatsapp?: boolean;
  maps?: boolean;
  instagram?: boolean;
}

export interface BioSettings {
  headline: string;
  instagram_url: string;
  links: BioLinksToggles;
}

export const BOTOES_FIXOS: {
  chave: keyof BioLinksToggles;
  rotulo: string;
  Icone: React.ComponentType<{ className?: string }>;
}[] = [
  { chave: 'menu', rotulo: 'Cardápio', Icone: BookOpenIcon },
  { chave: 'whatsapp', rotulo: 'WhatsApp', Icone: ChatBubbleLeftRightIcon },
  { chave: 'maps', rotulo: 'Como chegar', Icone: MapPinIcon },
  { chave: 'instagram', rotulo: 'Instagram', Icone: CameraIcon },
];

export interface NovoLinkForm {
  icon: string;
  title: string;
  url: string;
  iconUrl: string;
}

export interface InspetorDaBioProps {
  parte: ParteDaBio;
  rascunho: BioSettings;
  salvo: BioSettings;
  mudarRascunho: (parcial: Partial<Omit<BioSettings, 'links'>>) => void;
  alternarBotaoFixo: (chave: keyof BioLinksToggles, ligado: boolean) => void;

  /** Chave em gravação (desabilita só ela). */
  salvandoChave: keyof BioLinksToggles | null;

  links: BioLink[];
  alternarLink: (link: BioLink) => void;
  carregandoLinks: boolean;
  erroDosLinks: string | null;
  mover: (indice: number, direcao: -1 | 1) => void;
  excluir: (id: string) => void;
  novoLink: NovoLinkForm;
  mudarNovoLink: (parcial: Partial<NovoLinkForm>) => void;
  criarLink: (e: React.FormEvent) => void;
  criandoLink: boolean;

  stats: BioStats | null;
  carregandoStats: boolean;
  erroDasStats: string | null;
}

export const InspetorDaBio: React.FC<InspetorDaBioProps> = (p) => {
  const { rascunho, salvo } = p;

  if (p.parte === 'perfil') {
    return (
      <div className="flex flex-col gap-5">
        <Propriedade
          rotulo="Headline"
          mudou={rascunho.headline !== salvo.headline}
          valor={`${rascunho.headline.length}/120`}
        >
          <Input
            aria-label="Headline"
            maxLength={120}
            placeholder="Peça pelo cardápio, receba em casa"
            value={rascunho.headline}
            onChange={(e) => p.mudarRascunho({ headline: e.target.value })}
          />
        </Propriedade>
        <Propriedade rotulo="Instagram" mudou={rascunho.instagram_url !== salvo.instagram_url}>
          <Input
            aria-label="Instagram (URL)"
            placeholder="instagram.com/sualoja"
            value={rascunho.instagram_url}
            onChange={(e) => p.mudarRascunho({ instagram_url: e.target.value })}
          />
        </Propriedade>
      </div>
    );
  }

  if (p.parte === 'botoes') {
    return (
      <ul className="flex flex-col divide-y divide-border-token">
        {BOTOES_FIXOS.map(({ chave, rotulo, Icone }) => {
          const ligado = rascunho.links[chave] !== false;
          return (
            <li key={chave} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    ligado ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-fg-muted-token',
                  )}
                  aria-hidden
                >
                  <Icone className="h-4 w-4" />
                </span>
                <span className="truncate text-body font-semibold text-fg-token">{rotulo}</span>
              </span>
              <Switch
                rotulo={`Exibir ${rotulo} no link da bio`}
                ligado={ligado}
                desabilitado={p.salvandoChave === chave}
                onMudar={(marcado) => p.alternarBotaoFixo(chave, marcado)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  if (p.parte === 'links') {
    return (
      <div className="flex flex-col gap-5">
        {p.carregandoLinks ? (
          <Loading />
        ) : p.erroDosLinks ? (
          <p role="alert" className="text-sm text-danger-token">{p.erroDosLinks}</p>
        ) : p.links.length === 0 ? (
          <EmptyState titulo="Nenhum link personalizado" icone={<PlusIcon className="h-7 w-7" />} />
        ) : (
          <ul className="flex flex-col divide-y divide-border-token">
            {p.links.map((link, index) => {
              const ativo = link.is_active;
              return (
                <li
                  key={link.id}
                  className={cn('flex items-center gap-2.5 py-3 first:pt-0 last:pb-0 transition-opacity', !ativo && 'opacity-60')}
                >
                  {link.icon_url ? (
                    <img
                      src={link.icon_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg border border-border-token object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center superficie-2 text-base">
                      {link.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-body font-semibold text-fg-token">
                      <span className="truncate">{link.title}</span>
                      {!ativo && <Badge tone="neutral">Oculto</Badge>}
                    </p>
                    <p className="truncate text-caption text-fg-muted-token">{link.url}</p>
                  </div>
                  <Switch
                    rotulo={`${ativo ? 'Desativar' : 'Ativar'} link ${link.title}`}
                    ligado={ativo}
                    onMudar={() => p.alternarLink(link)}
                  />
                  <RowActions
                    rotulo={`Ações do link ${link.title}`}
                    acoes={[
                      {
                        rotulo: 'Mover para cima',
                        icone: <ArrowUpIcon className="h-4 w-4" />,
                        desabilitada: index === 0,
                        onClick: () => p.mover(index, -1),
                      },
                      {
                        rotulo: 'Mover para baixo',
                        icone: <ArrowDownIcon className="h-4 w-4" />,
                        desabilitada: index === p.links.length - 1,
                        onClick: () => p.mover(index, 1),
                      },
                      {
                        rotulo: 'Excluir',
                        icone: <TrashIcon className="h-4 w-4" />,
                        destrutiva: true,
                        onClick: () => p.excluir(link.id),
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <form className="flex flex-col gap-3 border-t border-border-token pt-4" onSubmit={p.criarLink}>
          <Campo rotulo="Emoji">
            <Input value={p.novoLink.icon} onChange={(e) => p.mudarNovoLink({ icon: e.target.value })} />
          </Campo>
          <Campo rotulo="Título">
            <Input
              placeholder="Promoção da semana"
              value={p.novoLink.title}
              onChange={(e) => p.mudarNovoLink({ title: e.target.value })}
            />
          </Campo>
          <Campo rotulo="URL">
            <Input placeholder="https://…" value={p.novoLink.url} onChange={(e) => p.mudarNovoLink({ url: e.target.value })} />
          </Campo>
          <Campo rotulo="Logo (URL da imagem, opcional)">
            <Input
              placeholder="https://…/logo.png"
              value={p.novoLink.iconUrl}
              onChange={(e) => p.mudarNovoLink({ iconUrl: e.target.value })}
            />
          </Campo>
          <Button type="submit" isLoading={p.criandoLink} className="w-full">
            Adicionar link
          </Button>
        </form>
      </div>
    );
  }

  // estatísticas
  if (p.carregandoStats) return <Loading />;
  if (p.erroDasStats) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted-token">{p.erroDasStats}</p>
        <Link to="/assinatura">
          <Button variant="outline">Ver planos</Button>
        </Link>
      </div>
    );
  }
  if (!p.stats) return null;
  return (
    <div className="flex flex-col gap-5">
      <Propriedade rotulo="Visitas em 30 dias">
        <p className="text-3xl font-bold text-fg-token">{p.stats.page_views.total}</p>
      </Propriedade>
      <TimeSeriesChart data={p.stats.page_views.series} xKey="date" yKey="views" label="Visitas" type="bar" />
      {p.stats.links.length > 0 && (
        <Propriedade rotulo="Mais clicados">
          <RankBarList items={p.stats.links.map((l) => ({ label: l.title, value: l.total }))} />
        </Propriedade>
      )}
    </div>
  );
};

export default InspetorDaBio;
