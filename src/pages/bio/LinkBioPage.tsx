import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

import { Card, Button, Input, Switch, Loading } from '../../components/common';
import { PageShell, PhonePreview, RowActions, EmptyState, Badge } from '../../components/ui';
import { PaywallModal } from '../../components/billing/PaywallModal';
import { TimeSeriesChart } from '../../components/reports/TimeSeriesChart';
import { RankBarList } from '../../components/reports/RankBarList';
import { getStores, updateStore, Store } from '../../services/storesApi';
import {
  BioLink,
  BioStats,
  listBioLinks,
  createBioLink,
  updateBioLink,
  deleteBioLink,
  reorderBioLinks,
  getBioStats,
} from '../../services/bioApi';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';
import { cn } from '../../utils/cn';

interface BioLinksToggles {
  menu?: boolean;
  whatsapp?: boolean;
  maps?: boolean;
  instagram?: boolean;
}

interface BioSettings {
  headline: string;
  instagram_url: string;
  links: BioLinksToggles;
}

const DEFAULT_BIO_SETTINGS: BioSettings = {
  headline: '',
  instagram_url: '',
  links: { menu: true, whatsapp: true, maps: true, instagram: true },
};

/**
 * Os quatro botões que o mini-site já traz prontos.
 *
 * Estava como uma lista de pares `[chave, rótulo]` dentro do JSX. Rótulo
 * sozinho não explica o que a chave faz — "Como chegar" para onde? — e sem
 * ícone as quatro linhas viram um bloco de texto igual, onde ninguém acha a
 * que veio desligar.
 */
const BOTOES_FIXOS: {
  chave: keyof BioLinksToggles;
  rotulo: string;
  explicacao: string;
  Icone: React.ComponentType<{ className?: string }>;
}[] = [
  { chave: 'menu', rotulo: 'Cardápio', explicacao: 'Leva direto para o seu cardápio online.', Icone: BookOpenIcon },
  { chave: 'whatsapp', rotulo: 'WhatsApp', explicacao: 'Abre a conversa no número da loja.', Icone: ChatBubbleLeftRightIcon },
  { chave: 'maps', rotulo: 'Como chegar', explicacao: 'Abre o endereço da loja no mapa.', Icone: MapPinIcon },
  { chave: 'instagram', rotulo: 'Instagram', explicacao: 'Usa o endereço preenchido acima.', Icone: CameraIcon },
];

function readBioSettings(metadata: Record<string, unknown> | undefined | null): BioSettings {
  const raw = (metadata?.bio_settings as Partial<BioSettings>) || {};
  return {
    headline: raw.headline ?? DEFAULT_BIO_SETTINGS.headline,
    instagram_url: raw.instagram_url ?? DEFAULT_BIO_SETTINGS.instagram_url,
    links: {
      menu: raw.links?.menu !== false,
      whatsapp: raw.links?.whatsapp !== false,
      maps: raw.links?.maps !== false,
      instagram: raw.links?.instagram !== false,
    },
  };
}

function extractDetail(err: unknown): { status?: number; detail?: string } {
  const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
  return { status: axiosErr?.response?.status, detail: axiosErr?.response?.data?.detail };
}

const LinkBioPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [bioSettings, setBioSettings] = useState<BioSettings>(DEFAULT_BIO_SETTINGS);
  const [savingContent, setSavingContent] = useState(false);
  const [salvandoChave, setSalvandoChave] = useState<keyof BioLinksToggles | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  const [links, setLinks] = useState<BioLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('🔗');
  const [newIconUrl, setNewIconUrl] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);

  const [stats, setStats] = useState<BioStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [paywall, setPaywall] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingStore(true);
    setStoreError(null);
    getStores()
      .then((res) => {
        if (!active) return;
        const match = res.results.find((s) => s.id === routeStoreId || s.slug === routeStoreId);
        if (!match) {
          setStoreError('Loja não encontrada.');
          return;
        }
        setStore(match);
        setBioSettings(readBioSettings(match.metadata as Record<string, unknown>));
      })
      .catch(() => {
        if (active) setStoreError('Não foi possível carregar a loja.');
      })
      .finally(() => {
        if (active) setLoadingStore(false);
      });
    return () => {
      active = false;
    };
  }, [routeStoreId]);

  // Usa o storeId da rota diretamente (aceita slug ou uuid) — não espera a
  // loja carregar, pra buscar os links em paralelo com getStores().
  const storeIdentifier = useMemo(() => store?.slug || store?.id || routeStoreId, [store, routeStoreId]);

  const loadLinks = () => {
    if (!storeIdentifier) return;
    setLoadingLinks(true);
    setLinksError(null);
    listBioLinks(storeIdentifier)
      .then((res) => {
        setLinks([...res].sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch(() => setLinksError('Não foi possível carregar os links.'))
      .finally(() => setLoadingLinks(false));
  };

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIdentifier]);

  useEffect(() => {
    let active = true;
    if (!store?.id) return;
    setLoadingStats(true);
    setStatsError(null);
    getBioStats(store.id, 30)
      .then((res) => {
        if (!active) return;
        setStats(res);
      })
      .catch((err) => {
        if (!active) return;
        const { status, detail } = extractDetail(err);
        if (status === 403 && detail) {
          setStatsError(detail);
          setPaywall(detail);
        } else {
          setStatsError('Não foi possível carregar as estatísticas.');
        }
      })
      .finally(() => {
        if (active) setLoadingStats(false);
      });
    return () => {
      active = false;
    };
  }, [store?.id]);

  const bioUrl = store?.slug ? `https://bio.cardapidex.com.br/${store.slug}` : '';

  const handleCopy = async () => {
    if (!bioUrl) return;
    // `navigator.clipboard` não existe em contexto não-seguro e falha em
    // parte dos navegadores; `copyToClipboard` tem fallback. E sem checar o
    // retorno a tela dizia "copiado" mesmo quando nada foi para a área de
    // transferência — o pior tipo de erro, o que se disfarça de sucesso.
    const ok = await copyToClipboard(bioUrl);
    if (!ok) {
      toast.error('Não consegui copiar — selecione o link manualmente');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Grava as configurações da bio. Uma função só, dois gatilhos.
   *
   * Devolve `true`/`false` porque quem chama precisa saber: a chave que falhou
   * tem que VOLTAR, senão a tela fica mostrando um estado que o servidor não
   * tem.
   */
  const gravarConfiguracoes = async (novo: BioSettings): Promise<boolean> => {
    if (!store) return false;
    setContentError(null);
    try {
      const currentMetadata = (store.metadata as Record<string, unknown>) || {};
      const updated = await updateStore(store.id, {
        metadata: { ...currentMetadata, bio_settings: novo },
      });
      setStore(updated);
      return true;
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) {
        setPaywall(detail);
      } else {
        setContentError('Não foi possível salvar o conteúdo.');
      }
      return false;
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContent(true);
    await gravarConfiguracoes(bioSettings);
    setSavingContent(false);
  };

  /**
   * A chave do botão fixo aplica na hora — como a do link personalizado.
   *
   * Antes ela só mexia no estado local e esperava um "Salvar" que morava
   * quatro campos abaixo, fora do campo de visão de quem acabou de mexer na
   * chave. Quem desligava via a chave virar e ia embora; nada tinha sido
   * gravado. Duas gramáticas de salvamento na mesma tela é uma a mais.
   */
  const alternarBotaoFixo = async (chave: keyof BioLinksToggles, ligado: boolean) => {
    const anterior = bioSettings;
    const proximo = { ...anterior, links: { ...anterior.links, [chave]: ligado } };
    setBioSettings(proximo);
    setSalvandoChave(chave);
    const ok = await gravarConfiguracoes(proximo);
    setSalvandoChave(null);
    if (!ok) setBioSettings(anterior);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !newTitle.trim() || !newUrl.trim()) return;
    setCreatingLink(true);
    try {
      await createBioLink({
        store: store.id,
        title: newTitle.trim(),
        url: newUrl.trim(),
        icon: newIcon || '🔗',
        icon_url: newIconUrl.trim(),
        sort_order: links.length,
        is_active: true,
      });
      setNewTitle('');
      setNewUrl('');
      setNewIcon('🔗');
      setNewIconUrl('');
      loadLinks();
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) {
        setPaywall(detail);
      } else {
        setLinksError('Não foi possível criar o link.');
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleToggleActive = async (link: BioLink) => {
    try {
      await updateBioLink(link.id, { is_active: !link.is_active });
      loadLinks();
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) {
        setPaywall(detail);
      } else {
        setLinksError('Não foi possível atualizar o link.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBioLink(id);
      loadLinks();
    } catch {
      setLinksError('Não foi possível excluir o link.');
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length || !storeIdentifier) return;
    const reordered = [...links];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setLinks(reordered);
    try {
      await reorderBioLinks(storeIdentifier, reordered.map((l) => l.id));
    } catch {
      setLinksError('Não foi possível reordenar os links.');
      loadLinks();
    }
  };

  if (loadingStore) {
    return <Loading />;
  }

  if (storeError || !store) {
    return <p className="text-fg-muted-token">{storeError || 'Loja não encontrada.'}</p>;
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'Cardápio' }, { rotulo: 'Link na Bio' }]}
      titulo="Link na Bio"
      acoes={
        <>
          <Button variant="outline" onClick={handleCopy} disabled={!bioUrl}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
          <a href={bioUrl || undefined} target="_blank" rel="noreferrer">
            <Button variant="outline" disabled={!bioUrl}>Abrir mini-site</Button>
          </a>
        </>
      }
    >
      {/* Editor à esquerda, página real à direita.
          Empilhado, o preview ficava abaixo de quatro cards de formulário — ou
          seja, fora da tela justamente enquanto você edita, que é quando ele
          serve. Lado a lado, cada switch tem consequência visível na hora.
          A coluna do preview é `sticky`: o formulário é longo e o celular
          precisa acompanhar a rolagem. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Identidade" subtitle="O que aparece no topo do mini-site.">
            <form className="max-w-xl space-y-4" onSubmit={handleSaveContent}>
              <Input
                id="bio-headline"
                label="Headline"
                maxLength={120}
                placeholder="Peça pelo cardápio, receba em casa"
                value={bioSettings.headline}
                onChange={(e) => setBioSettings((prev) => ({ ...prev, headline: e.target.value }))}
              />
              <Input
                id="bio-instagram-url"
                label="Instagram (URL)"
                placeholder="instagram.com/sualoja"
                value={bioSettings.instagram_url}
                onChange={(e) => setBioSettings((prev) => ({ ...prev, instagram_url: e.target.value }))}
              />
              {contentError && <p className="text-sm text-danger-token">{contentError}</p>}
              <Button type="submit" isLoading={savingContent}>
                Salvar
              </Button>
            </form>
          </Card>

          {/* Botões fixos: chave aplica na hora, como no resto do painel. */}
          <Card title="Botões fixos" subtitle="Vêm prontos com a loja. Desligue o que você não usa.">
            <ul className="divide-y divide-border-token">
              {BOTOES_FIXOS.map(({ chave, rotulo, explicacao, Icone }) => {
                const ligado = bioSettings.links[chave] !== false;
                return (
                  <li key={chave} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                        ligado
                          ? 'border-brand/40 bg-brand-soft text-brand-ink'
                          : 'border-border-token bg-surface-2 text-fg-muted-token',
                      )}
                    >
                      <Icone className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg-token">{rotulo}</p>
                      <p className="text-xs text-fg-muted-token">{explicacao}</p>
                    </div>
                    {salvandoChave === chave && <Loading size="sm" />}
                    <Switch
                      ariaLabel={`Exibir ${rotulo} no link da bio`}
                      checked={ligado}
                      disabled={salvandoChave === chave}
                      onChange={(marcado) => alternarBotaoFixo(chave, marcado)}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card
            title="Links personalizados"
            subtitle="Qualquer outro destino: promoção, pesquisa, outra loja sua."
          >
            <div className="space-y-4">
              {loadingLinks ? (
                <Loading />
              ) : linksError ? (
                <p className="text-sm text-danger-token">{linksError}</p>
              ) : links.length === 0 ? (
                <EmptyState
                  titulo="Nenhum link personalizado"
                  descricao="Use o formulário abaixo para apontar para uma promoção, uma pesquisa ou outra loja sua."
                  icone={<PlusIcon className="h-7 w-7" />}
                />
              ) : (
                <ul className="divide-y divide-border-token">
                  {links.map((link, index) => (
                    <li
                      key={link.id}
                      className={cn(
                        'flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-opacity',
                        !link.is_active && 'opacity-60',
                      )}
                    >
                      {link.icon_url ? (
                        <img
                          src={link.icon_url}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg border border-border-token object-cover"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-token bg-surface-2 text-lg">
                          {link.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-fg-token">
                          <span className="truncate">{link.title}</span>
                          {/* A chave cinza é fácil de não ver numa lista de
                              cinco. O selo diz em palavra o que aconteceu. */}
                          {!link.is_active && <Badge tone="neutral">Oculto</Badge>}
                        </p>
                        <p className="truncate text-xs text-fg-muted-token">{link.url}</p>
                      </div>
                      <Switch
                        ariaLabel={`${link.is_active ? 'Desativar' : 'Ativar'} link ${link.title}`}
                        checked={link.is_active}
                        onChange={() => handleToggleActive(link)}
                      />
                      <RowActions
                        rotulo={`Ações do link ${link.title}`}
                        acoes={[
                          {
                            rotulo: 'Mover para cima',
                            icone: <ArrowUpIcon className="h-4 w-4" />,
                            desabilitada: index === 0,
                            onClick: () => handleMove(index, -1),
                          },
                          {
                            rotulo: 'Mover para baixo',
                            icone: <ArrowDownIcon className="h-4 w-4" />,
                            desabilitada: index === links.length - 1,
                            onClick: () => handleMove(index, 1),
                          },
                          {
                            rotulo: 'Excluir',
                            icone: <TrashIcon className="h-4 w-4" />,
                            destrutiva: true,
                            onClick: () => handleDelete(link.id),
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* Grade fixa em vez de `flex-wrap`: os quatro campos tinham
                  larguras diferentes a cada tamanho de janela, e o botão
                  terminava em qualquer lugar da linha. */}
              <form
                className="grid grid-cols-1 gap-3 border-t border-border-token pt-4 sm:grid-cols-[4.5rem_1fr_1fr]"
                onSubmit={handleCreateLink}
              >
                <Input
                  id="bio-link-icon"
                  label="Emoji"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                />
                <Input
                  id="bio-link-title"
                  label="Título"
                  placeholder="Promoção da semana"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Input
                  id="bio-link-url"
                  label="URL"
                  placeholder="https://…"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    id="bio-link-icon-url"
                    label="Logo (URL da imagem, opcional)"
                    placeholder="https://…/logo.png"
                    value={newIconUrl}
                    onChange={(e) => setNewIconUrl(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" isLoading={creatingLink} className="w-full">
                    Adicionar link
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <Card title="Estatísticas" subtitle="Últimos 30 dias.">
            {loadingStats ? (
              <Loading />
            ) : statsError ? (
              <div className="space-y-3">
                <p className="text-sm text-fg-muted-token">{statsError}</p>
                <Link to="/assinatura">
                  <Button variant="outline">Ver planos</Button>
                </Link>
              </div>
            ) : stats ? (
              <div className="space-y-5">
                <div>
                  <p className="overline text-fg-muted-token">Visitas</p>
                  <p className="text-3xl font-bold text-fg-token">{stats.page_views.total}</p>
                </div>
                <TimeSeriesChart
                  data={stats.page_views.series}
                  xKey="date"
                  yKey="views"
                  label="Visitas"
                  type="bar"
                />
                {stats.links.length > 0 && (
                  <div className="space-y-2">
                    <p className="overline text-fg-muted-token">Mais clicados</p>
                    <RankBarList items={stats.links.map((l) => ({ label: l.title, value: l.total }))} />
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <PhonePreview
            url={bioUrl}
            titulo="Pré-visualização"
            aoVivo
            rodape={
              bioUrl ? (
                <>
                  <p className="overline">Seu link público</p>
                  <code className="text-caption text-fg-token">{bioUrl}</code>
                </>
              ) : null
            }
          />
        </aside>
      </div>

      <PaywallModal open={!!paywall} message={paywall ?? ''} onClose={() => setPaywall(null)} />
    </PageShell>
  );
};

export default LinkBioPage;
