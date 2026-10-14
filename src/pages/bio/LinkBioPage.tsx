import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Loading } from '../../components/common';
import { BarraDeAlteracoes, Button, PageShell, PhonePreview } from '../../components/ui';
import { PaywallModal } from '../../components/billing/PaywallModal';
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
import { copyToClipboard } from '../../utils/clipboard';
import { cn } from '../../utils/cn';
import InspetorDaBio, { BioLinksToggles, BioSettings, NovoLinkForm } from './InspetorDaBio';
import {
  PARTES_DA_BIO,
  PARTE_DA_BIO_PADRAO,
  definicaoDaParteDaBio,
  ehParteDaBio,
  type ParteDaBio,
} from './partesDaBio';

const DEFAULT_BIO_SETTINGS: BioSettings = {
  headline: '',
  instagram_url: '',
  links: { menu: true, whatsapp: true, maps: true, instagram: true },
};

const NOVO_LINK_VAZIO: NovoLinkForm = { icon: '🔗', title: '', url: '', iconUrl: '' };

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

const CHAVES_FIXAS: (keyof BioLinksToggles)[] = ['menu', 'whatsapp', 'maps', 'instagram'];

/**
 * Link na Bio — editor com prévia (14/10).
 *
 * Mesmo molde do Storefront: partes à esquerda, a página real no meio,
 * propriedades da parte escolhida à direita. Antes eram cinco blocos
 * empilhados com dois salvar e chaves que aplicavam na hora; agora tudo o que
 * é campo vai para um rascunho e a `BarraDeAlteracoes` grava só o que mudou.
 */
const LinkBioPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const [params, setParams] = useSearchParams();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [rascunho, setRascunho] = useState<BioSettings>(DEFAULT_BIO_SETTINGS);
  const [salvandoChave, setSalvandoChave] = useState<keyof BioLinksToggles | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  // Muda a cada save: remonta o iframe para mostrar o que foi gravado.
  const [geracaoDaPrevia, setGeracaoDaPrevia] = useState(0);

  const [links, setLinks] = useState<BioLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [novoLink, setNovoLink] = useState<NovoLinkForm>(NOVO_LINK_VAZIO);
  const [creatingLink, setCreatingLink] = useState(false);

  const [stats, setStats] = useState<BioStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [paywall, setPaywall] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A parte aberta vive na URL (?parte=): recarregar não perde o lugar.
  const parteDaUrl = params.get('parte');
  const parte: ParteDaBio = ehParteDaBio(parteDaUrl) ? parteDaUrl : PARTE_DA_BIO_PADRAO;
  const definicao = definicaoDaParteDaBio(parte);

  const irParaParte = (nova: ParteDaBio) => {
    const next = new URLSearchParams(params);
    next.set('parte', nova);
    setParams(next, { replace: true });
  };

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
        setRascunho(readBioSettings(match.metadata as Record<string, unknown>));
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
    // `navigator.clipboard` não existe em contexto não-seguro; `copyToClipboard`
    // tem fallback. E sem checar o retorno a tela dizia "copiado" sem ter
    // copiado — o erro que se disfarça de sucesso.
    const ok = await copyToClipboard(bioUrl);
    if (!ok) {
      toast.error('Não consegui copiar — selecione o link manualmente');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── o que mudou em relação ao que está gravado ──
  // Só os campos de texto passam pela barra. Chaves (botão fixo, link) aplicam
  // na hora: uma chave que espera um Salvar longe dela mente.
  const salvo = useMemo(() => readBioSettings(store?.metadata as Record<string, unknown>), [store]);
  const quantidadeDeAlteracoes =
    (rascunho.headline !== salvo.headline ? 1 : 0) + (rascunho.instagram_url !== salvo.instagram_url ? 1 : 0);

  const pendenteNaParte = (id: ParteDaBio): boolean => id === 'perfil' && quantidadeDeAlteracoes > 0;

  // Sair da tela com alteração não salva pergunta antes.
  useEffect(() => {
    if (quantidadeDeAlteracoes === 0) return undefined;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [quantidadeDeAlteracoes]);

  const mudarRascunho = (parcial: Partial<Omit<BioSettings, 'links'>>) => setRascunho((r) => ({ ...r, ...parcial }));
  const descartar = () => {
    // Só os textos: as chaves já estão gravadas.
    setRascunho((r) => ({ ...r, headline: salvo.headline, instagram_url: salvo.instagram_url }));
    setContentError(null);
  };

  /** Grava as configurações da bio (mesmo payload de sempre). `false` = falhou. */
  const gravarConfiguracoes = async (novo: BioSettings): Promise<boolean> => {
    if (!store) return false;
    try {
      const currentMetadata = (store.metadata as Record<string, unknown>) || {};
      const updated = await updateStore(store.id, {
        metadata: { ...currentMetadata, bio_settings: novo },
      });
      setStore(updated);
      return true;
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) setPaywall(detail);
      else setContentError('Não foi possível salvar o conteúdo.');
      return false;
    }
  };

  /** Salvar da barra: textos do perfil. Os links do store seguem os gravados. */
  const salvar = async () => {
    setSalvando(true);
    setContentError(null);
    const ok = await gravarConfiguracoes({ ...rascunho, links: salvo.links });
    setSalvando(false);
    if (ok) {
      toast.success('Link na bio salvo');
      setGeracaoDaPrevia((g) => g + 1);
    }
  };

  /**
   * A chave do botão fixo aplica na hora. Manda o salvo + a chave, não o
   * rascunho: texto ainda não salvo não pode ir junto sem a pessoa pedir.
   * Falhou: a chave volta.
   */
  const alternarBotaoFixo = async (chave: keyof BioLinksToggles, ligado: boolean) => {
    setSalvandoChave(chave);
    setRascunho((r) => ({ ...r, links: { ...r.links, [chave]: ligado } }));
    setContentError(null);
    const ok = await gravarConfiguracoes({ ...salvo, links: { ...salvo.links, [chave]: ligado } });
    setSalvandoChave(null);
    if (ok) {
      setGeracaoDaPrevia((g) => g + 1);
    } else {
      setRascunho((r) => ({ ...r, links: { ...r.links, [chave]: !ligado } }));
    }
  };

  const handleToggleActive = async (link: BioLink) => {
    try {
      await updateBioLink(link.id, { is_active: !link.is_active });
      loadLinks();
      setGeracaoDaPrevia((g) => g + 1);
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) setPaywall(detail);
      else setLinksError('Não foi possível atualizar o link.');
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !novoLink.title.trim() || !novoLink.url.trim()) return;
    setCreatingLink(true);
    try {
      await createBioLink({
        store: store.id,
        title: novoLink.title.trim(),
        url: novoLink.url.trim(),
        icon: novoLink.icon || '🔗',
        icon_url: novoLink.iconUrl.trim(),
        sort_order: links.length,
        is_active: true,
      });
      setNovoLink(NOVO_LINK_VAZIO);
      loadLinks();
      setGeracaoDaPrevia((g) => g + 1);
    } catch (err) {
      const { status, detail } = extractDetail(err);
      if (status === 403 && detail) setPaywall(detail);
      else setLinksError('Não foi possível criar o link.');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBioLink(id);
      loadLinks();
      setGeracaoDaPrevia((g) => g + 1);
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
      setGeracaoDaPrevia((g) => g + 1);
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

  const Icone = definicao.icone;

  return (
    <PageShell
      variante="quadro"
      trilha={[{ rotulo: 'Cardápio' }, { rotulo: 'Link na Bio' }]}
      titulo="Link na Bio"
      acoes={
        <div className="flex flex-wrap items-center gap-2">
          {quantidadeDeAlteracoes > 0 ? (
            <BarraDeAlteracoes
              embutida
              quantidade={quantidadeDeAlteracoes}
              salvando={salvando}
              onSalvar={() => void salvar()}
              onDescartar={descartar}
            />
          ) : (
            <span className="flex items-center gap-1.5 px-2 text-caption text-fg-muted-token">
              <CheckCircleIcon className="h-4 w-4 text-success-token" aria-hidden />
              Tudo salvo
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!bioUrl}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
          <a href={bioUrl || undefined} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" disabled={!bioUrl}>Abrir mini-site</Button>
          </a>
        </div>
      }
    >
      {/* Celular: partes em faixa no topo, prévia, propriedades embaixo.
          Computador: partes | prévia | propriedades. */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[210px_minmax(0,1fr)_340px]">
        <nav
          aria-label="Partes da página de bio"
          className="superficie flex gap-1 overflow-x-auto p-1.5 max-xl:col-span-full xl:flex-col xl:overflow-y-auto xl:p-2"
        >
          {PARTES_DA_BIO.map((p) => {
            const IconeDaParte = p.icone;
            const ativa = p.id === parte;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => irParaParte(p.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-body transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  ativa ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token',
                )}
              >
                <IconeDaParte className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 truncate">{p.rotulo}</span>
                {pendenteNaParte(p.id) && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Alterado, ainda não salvo" />
                )}
              </button>
            );
          })}
        </nav>

        <section
          aria-label="Prévia da página de bio"
          className="flex min-h-[620px] min-w-0 flex-col rounded-xl bg-surface-2 p-3 lg:min-h-0"
        >
          <PhonePreview
            key={geracaoDaPrevia}
            url={bioUrl}
            titulo="Pré-visualização"
            aoVivo
            preencher
            rodape={bioUrl ? <code className="text-caption text-fg-token">{bioUrl}</code> : null}
          />
        </section>

        <aside aria-label={definicao.rotulo} className="superficie flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-border-token px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-ink" aria-hidden>
              <Icone className="h-[18px] w-[18px]" />
            </span>
            <h2 className="text-base font-semibold text-fg-token">{definicao.rotulo}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <InspetorDaBio
              parte={parte}
              rascunho={rascunho}
              salvo={salvo}
              mudarRascunho={mudarRascunho}
              alternarBotaoFixo={alternarBotaoFixo}
              salvandoChave={salvandoChave}
              links={links}
              alternarLink={handleToggleActive}
              carregandoLinks={loadingLinks}
              erroDosLinks={linksError}
              mover={handleMove}
              excluir={handleDelete}
              novoLink={novoLink}
              mudarNovoLink={(parcial) => setNovoLink((n) => ({ ...n, ...parcial }))}
              criarLink={handleCreateLink}
              criandoLink={creatingLink}
              stats={stats}
              carregandoStats={loadingStats}
              erroDasStats={statsError}
            />
            {contentError && <p role="alert" className="mt-4 text-sm text-danger-token">{contentError}</p>}
          </div>
        </aside>
      </div>

      <PaywallModal open={!!paywall} message={paywall ?? ''} onClose={() => setPaywall(null)} />
    </PageShell>
  );
};

export default LinkBioPage;
