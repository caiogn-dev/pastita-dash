import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Input, Switch, Loading } from '../../components/common';
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
    await navigator.clipboard.writeText(bioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSavingContent(true);
    setContentError(null);
    try {
      const currentMetadata = (store.metadata as Record<string, unknown>) || {};
      const updated = await updateStore(store.id, {
        metadata: {
          ...currentMetadata,
          bio_settings: bioSettings,
        },
      });
      setStore(updated);
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) {
        setPaywall(detail);
      } else {
        setContentError('Não foi possível salvar o conteúdo.');
      }
    } finally {
      setSavingContent(false);
    }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-fg-token">Link na Bio</h1>
        <p className="text-sm text-fg-muted-token">
          Página pública com o essencial da sua loja para colocar na bio do Instagram.
        </p>
      </div>

      <Card title="Sua página">
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-surface-2 px-3 py-2 text-sm text-fg-token">{bioUrl}</code>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          <a href={bioUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">Abrir</Button>
          </a>
        </div>
      </Card>

      <Card title="Conteúdo">
        <form className="space-y-4" onSubmit={handleSaveContent}>
          <Input
            id="bio-headline"
            label="Headline"
            maxLength={120}
            value={bioSettings.headline}
            onChange={(e) => setBioSettings((prev) => ({ ...prev, headline: e.target.value }))}
          />
          <Input
            id="bio-instagram-url"
            label="Instagram (URL)"
            value={bioSettings.instagram_url}
            onChange={(e) => setBioSettings((prev) => ({ ...prev, instagram_url: e.target.value }))}
          />

          <div className="space-y-3">
            {([
              ['menu', 'Cardápio'],
              ['whatsapp', 'WhatsApp'],
              ['maps', 'Como chegar'],
              ['instagram', 'Instagram'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm text-fg-token">
                {label}
                <Switch
                  checked={bioSettings.links[key] !== false}
                  onChange={(checked) =>
                    setBioSettings((prev) => ({
                      ...prev,
                      links: { ...prev.links, [key]: checked },
                    }))
                  }
                />
              </label>
            ))}
          </div>

          {contentError && <p className="text-sm text-fg-muted-token">{contentError}</p>}

          <Button type="submit" isLoading={savingContent}>
            Salvar
          </Button>
        </form>
      </Card>

      <Card title="Links personalizados">
        <div className="space-y-4">
          {loadingLinks ? (
            <Loading />
          ) : linksError ? (
            <p className="text-sm text-fg-muted-token">{linksError}</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-fg-muted-token">Nenhum link personalizado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link, index) => (
                <li
                  key={link.id}
                  className="flex items-center gap-3 rounded border border-border-token px-3 py-2"
                >
                  {link.icon_url ? (
                    <img
                      src={link.icon_url}
                      alt=""
                      className="h-7 w-7 rounded-md object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <span className="text-lg">{link.icon}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg-token">{link.title}</p>
                    <p className="truncate text-xs text-fg-muted-token">{link.url}</p>
                  </div>
                  <Switch checked={link.is_active} onChange={() => handleToggleActive(link)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="mover para cima"
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="mover para baixo"
                    disabled={index === links.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)}>
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form className="flex flex-wrap items-end gap-3 border-t border-border-token pt-4" onSubmit={handleCreateLink}>
            <Input
              id="bio-link-icon"
              label="Emoji"
              className="w-16"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            />
            <Input
              id="bio-link-title"
              label="Título"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Input
              id="bio-link-url"
              label="URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Input
              id="bio-link-icon-url"
              label="Logo (URL da imagem, opcional)"
              placeholder="https://…/logo.png"
              value={newIconUrl}
              onChange={(e) => setNewIconUrl(e.target.value)}
            />
            <Button type="submit" isLoading={creatingLink}>
              Adicionar link
            </Button>
          </form>
        </div>
      </Card>

      <Card title="Estatísticas (30 dias)">
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
          <div className="space-y-4">
            <p className="text-sm text-fg-token">
              <span className="text-2xl font-semibold">{stats.page_views.total}</span>{' '}
              <span className="text-fg-muted-token">visitas nos últimos {stats.days} dias</span>
            </p>
            <TimeSeriesChart
              data={stats.page_views.series}
              xKey="date"
              yKey="views"
              label="Visitas"
              type="bar"
            />
            <RankBarList items={stats.links.map((l) => ({ label: l.title, value: l.total }))} />
          </div>
        ) : null}
      </Card>

      <PaywallModal open={!!paywall} message={paywall ?? ''} onClose={() => setPaywall(null)} />
    </div>
  );
};

export default LinkBioPage;
