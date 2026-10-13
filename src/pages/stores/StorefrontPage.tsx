import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getStore, updateStore, updateStoreWithFiles, type Store } from '../../services/storesApi';
import { getErrorMessage } from '../../services';
import { useStore } from '../../hooks';
import { usePreviaAoVivo, type AreaDaPrevia } from '../../hooks/usePreviaAoVivo';
import { buildStorefrontUrl, buildStorefrontPreviewUrl } from '../../utils/storefrontUrl';
import {
  BarraDeAlteracoes,
  Button,
  Card,
  Input,
  PageShell,
  PageTabs,
  PhonePreview,
  Secao,
  type Dispositivo,
} from '../../components/ui';
import {
  ArrowUpTrayIcon,
  GlobeAltIcon,
  PhotoIcon,
  RectangleGroupIcon,
  SwatchIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { buscarTemplates, TEMPLATES_DE_EMERGENCIA, type TemplateDoCardapio } from './templatesDoCardapio';
import BannersSection from './BannersSection';
import ExibicaoDoCardapioSection from './ExibicaoDoCardapioSection';
import {
  EXIBICAO_PADRAO,
  catalogoDaLojaService,
  diferencas,
  escolherAmostra,
  exibicaoDoCardapioService,
  type AmostraDoCardapio,
  type ExibicaoDoCardapio,
} from '../../services/exibicaoDoCardapio';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Tipo não suportado: ${file.type}. Use JPG, PNG ou WebP.`;
  }
  if (file.size > maxBytes) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: ${maxBytes / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * O tipo é `string`, não uma união fechada: os templates vêm do backend
 * (`GET /stores/templates/`), e uma união escrita aqui obrigaria deploy do
 * painel a cada template novo — que foi exatamente como o `banquete` ficou
 * invisível nesta tela.
 */
type Template = string;

interface StorefrontForm {
  template: Template;
  primary_color: string;
  secondary_color: string;
  tagline: string;
  custom_domain: string;
}

const DEFAULT_FORM: StorefrontForm = {
  template: 'fresh',
  primary_color: '#2D6A4F',
  secondary_color: '#1B4332',
  tagline: '',
  custom_domain: '',
};

/** Espelha a loja persistida no formato do formulário. Fonte única usada tanto
 *  na carga quanto no rollback do save — o rascunho nunca deve divergir do que
 *  o backend realmente guardou. */
const formFromStore = (data: Store): StorefrontForm => ({
  template: (data.template as Template) || DEFAULT_FORM.template,
  primary_color: data.primary_color || DEFAULT_FORM.primary_color,
  secondary_color: data.secondary_color || DEFAULT_FORM.secondary_color,
  tagline: data.tagline || DEFAULT_FORM.tagline,
  custom_domain: data.custom_domain || DEFAULT_FORM.custom_domain,
});

/**
 * Abas pela parte da vitrine que mudam. Abrir uma aba leva a prévia até essa
 * parte — mexer no topo e ficar olhando o rodapé é o que fazia a tela parecer
 * "botões sem efeito".
 */
const ABAS = [
  { id: 'marca', rotulo: 'Marca', icone: SwatchIcon },
  { id: 'cardapio', rotulo: 'Cardápio', icone: Squares2X2Icon },
  { id: 'banners', rotulo: 'Banners', icone: RectangleGroupIcon },
  { id: 'endereco', rotulo: 'Endereço', icone: GlobeAltIcon },
];
const AREA_DA_ABA: Record<string, AreaDaPrevia | undefined> = {
  marca: 'topo',
  cardapio: 'cartao',
  banners: 'topo',
};

const mensagemDoErro = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || getErrorMessage(e)
  || 'Não consegui salvar. Nada foi alterado.';

/**
 * Storefront — editor da vitrine com a vitrine de verdade ao lado.
 *
 * Refeito em 13/10 (padrão do editor de tema da Shopify): tudo o que se mexe
 * aparece NA HORA na prévia (rascunho por postMessage, sem gravar), a parte
 * mexida acende, celular ou computador, e UM salvar para a página inteira que
 * só aparece quando há alteração. Antes: dois botões de salvar, prévia que só
 * mudava depois de gravar, e escolhas descritas em texto.
 */
export const StorefrontPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();
  const [params] = useSearchParams();

  const storeData = stores.find(s => s.id === contextStoreId || s.slug === contextStoreId);
  const effectiveStoreId =
    routeStoreId ||
    storeData?.slug ||
    contextStoreId ||
    null;

  const [saving, setSaving] = useState(false);
  // Muda a cada save: remonta o iframe da prévia para mostrar o que foi gravado.
  const [geracaoDaPrevia, setGeracaoDaPrevia] = useState(0);
  const [dispositivo, setDispositivo] = useState<Dispositivo>('celular');
  const [store, setStore] = useState<Store | null>(null);
  // Os templates vêm do backend. Começa no fallback para a tela nunca abrir
  // sem opção nenhuma — aparência vazia é pior que lista de emergência.
  const [templates, setTemplates] = useState<TemplateDoCardapio[]>(TEMPLATES_DE_EMERGENCIA);
  const [form, setForm] = useState<StorefrontForm>(DEFAULT_FORM);

  const [exibicaoGravada, setExibicaoGravada] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [exibicao, setExibicao] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [erroDaExibicao, setErroDaExibicao] = useState('');
  const [amostra, setAmostra] = useState<AmostraDoCardapio | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  // Track blob URLs so we can revoke them to avoid memory leaks
  const logoBlobRef = useRef<string | null>(null);
  const bannerBlobRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
      if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
    };
  }, []);

  const loadStore = useCallback(async () => {
    if (!effectiveStoreId) return;
    try {
      const data = await getStore(effectiveStoreId);
      setStore(data);
      setForm(formFromStore(data));
    } catch (err) {
      console.error('[StorefrontPage] loadStore:', err);
      toast.error(getErrorMessage(err) || 'Erro ao carregar configurações da loja');
    }
  }, [effectiveStoreId]);

  useEffect(() => { loadStore(); }, [loadStore]);

  useEffect(() => { buscarTemplates().then(setTemplates); }, []);

  // Exibição e um produto de verdade para os desenhos — por slug, depois da loja.
  const slug = store?.slug || '';
  useEffect(() => {
    if (!slug) return undefined;
    let vivo = true;
    exibicaoDoCardapioService.ler(slug)
      .then((e) => { if (vivo) { setExibicaoGravada(e); setExibicao(e); } })
      .catch((e) => console.error('[StorefrontPage] exibição:', e));
    catalogoDaLojaService.ler(slug)
      .then((c) => { if (vivo) setAmostra(escolherAmostra(c)); })
      .catch(() => { /* sem amostra, os desenhos usam um bloco da marca */ });
    return () => { vivo = false; };
  }, [slug]);

  const urlPublica = store ? buildStorefrontUrl(store) : null;
  // O iframe aponta para /preview/{slug}, não para a loja: a loja leva ao
  // checkout e por isso continua bloqueada para enquadramento.
  const urlPreview = store ? buildStorefrontPreviewUrl(store) : null;
  const { registrarIframe, enviarRascunho, focar } = usePreviaAoVivo(urlPreview || '');

  // Rascunho → prévia, a cada mudança (120 ms para não mandar por tecla).
  useEffect(() => {
    if (!store) return undefined;
    const t = setTimeout(() => {
      enviarRascunho({
        exibicao,
        loja: {
          template: form.template,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          tagline: form.tagline,
          ...(logoFile ? { logo: logoFile } : {}),
          ...(bannerFile ? { banner: bannerFile } : {}),
        },
      });
    }, 120);
    return () => clearTimeout(t);
  }, [store, form, exibicao, logoFile, bannerFile, enviarRascunho]);

  // Abrir uma aba leva a prévia até a parte que ela muda.
  const abaAtiva = params.get('aba') || ABAS[0].id;
  useEffect(() => {
    const area = AREA_DA_ABA[abaAtiva];
    if (area && store) focar(area);
  }, [abaAtiva, store, focar]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_LOGO_SIZE);
    if (err) { toast.error(err); e.target.value = ''; return; }
    if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
    const url = URL.createObjectURL(file);
    logoBlobRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
    focar('topo');
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_BANNER_SIZE);
    if (err) { toast.error(err); e.target.value = ''; return; }
    if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
    const url = URL.createObjectURL(file);
    bannerBlobRef.current = url;
    setBannerFile(file);
    setBannerPreview(url);
    focar('topo');
  };

  const clearLogo = () => {
    if (logoBlobRef.current) { URL.revokeObjectURL(logoBlobRef.current); logoBlobRef.current = null; }
    setLogoFile(null);
    setLogoPreview('');
  };

  const clearBanner = () => {
    if (bannerBlobRef.current) { URL.revokeObjectURL(bannerBlobRef.current); bannerBlobRef.current = null; }
    setBannerFile(null);
    setBannerPreview('');
  };

  const mudarForm = (parcial: Partial<StorefrontForm>) => setForm((f) => ({ ...f, ...parcial }));
  const mudarExibicao = (parcial: Partial<ExibicaoDoCardapio>) => {
    setExibicao((e) => ({ ...e, ...parcial }));
    setErroDaExibicao('');
  };

  // O que difere do que está gravado — conta para a barra de salvar.
  const camposDaLojaMudados = useMemo(() => {
    if (!store) return [] as (keyof StorefrontForm)[];
    const salvo = formFromStore(store);
    return (Object.keys(form) as (keyof StorefrontForm)[]).filter((k) => form[k] !== salvo[k]);
  }, [form, store]);
  const exibicaoMudada = diferencas(exibicaoGravada, exibicao);
  const lojaMudou = camposDaLojaMudados.length > 0 || Boolean(logoFile) || Boolean(bannerFile);
  const quantidadeDeAlteracoes =
    camposDaLojaMudados.length + (logoFile ? 1 : 0) + (bannerFile ? 1 : 0) + Object.keys(exibicaoMudada).length;

  // Sair da tela com alteração não salva pergunta antes.
  useEffect(() => {
    if (quantidadeDeAlteracoes === 0) return undefined;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [quantidadeDeAlteracoes]);

  const descartar = () => {
    if (store) setForm(formFromStore(store));
    clearLogo();
    clearBanner();
    setExibicao(exibicaoGravada);
    setErroDaExibicao('');
  };

  const salvar = async () => {
    if (!effectiveStoreId) return;

    if (!HEX_COLOR_RE.test(form.primary_color)) {
      toast.error('Cor primária inválida. Use formato hexadecimal #RRGGBB.');
      return;
    }
    if (!HEX_COLOR_RE.test(form.secondary_color)) {
      toast.error('Cor secundária inválida. Use formato hexadecimal #RRGGBB.');
      return;
    }

    setSaving(true);
    let tudoCerto = true;
    try {
      if (lojaMudou) {
        try {
          if (logoFile || bannerFile) {
            await updateStoreWithFiles(effectiveStoreId, {
              ...form,
              ...(logoFile ? { logo: logoFile } : {}),
              ...(bannerFile ? { banner: bannerFile } : {}),
            });
          } else {
            await updateStore(effectiveStoreId, form);
          }
          clearLogo();
          clearBanner();
          await loadStore();
        } catch (err) {
          tudoCerto = false;
          console.error('[StorefrontPage] salvar loja:', err);
          toast.error(getErrorMessage(err) || 'Erro ao salvar. Tente novamente.');
          // Rollback: o save FALHOU, então o backend não mudou. Sem isto o rascunho
          // otimista (cartão de template destacado, cores, domínio) permanecia na
          // tela dando a impressão de que salvou — a queixa era o cartão marcado
          // num template que nunca foi persistido. Volta ao que a loja tem de fato.
          if (store) setForm(formFromStore(store));
        }
      }

      if (Object.keys(exibicaoMudada).length > 0 && slug) {
        try {
          const novo = await exibicaoDoCardapioService.salvar(slug, exibicaoMudada);
          setExibicaoGravada(novo);
          setExibicao(novo);
        } catch (err) {
          tudoCerto = false;
          console.error('[StorefrontPage] salvar exibição:', err);
          // A exibição mantém o rascunho: o erro diz o que corrigir.
          setErroDaExibicao(mensagemDoErro(err));
        }
      }

      if (tudoCerto) {
        toast.success('Storefront salvo');
        setGeracaoDaPrevia((g) => g + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6 text-fg-muted-token">Carregando...</div>;

  const logoAtual = logoPreview || store.logo_url || '';

  return (
    <PageShell
      trilha={[{ rotulo: 'Configurações' }, { rotulo: 'Storefront' }]}
      titulo="Storefront"
      acoes={
        urlPublica ? (
          <a href={urlPublica} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">Abrir cardápio</Button>
          </a>
        ) : undefined
      }
    >
      {/* Editor à esquerda, cardápio real à direita, mudando a cada clique. */}
      <div
        className={
          dispositivo === 'computador'
            ? 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'
            : 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'
        }
      >
        <div className="flex min-w-0 flex-col gap-6">
          <PageTabs abas={ABAS} ariaLabel="Partes da vitrine">
            {(aba) => (
              <div className="flex flex-col gap-6">
                {aba === 'marca' && (
                  <>
                    {/* Identidade do cardápio — capa + logo compostos como aparecem no cardápio real (WYSIWYG) */}
                    <Card noPadding className="overflow-hidden">
                      <div className="px-6 pt-5 pb-3 border-b border-border-token">
                        <h2 className="font-display text-lg tracking-wide text-fg-token">Identidade do cardápio</h2>
                        <p className="mt-0.5 text-sm text-fg-muted-token">Capa e logo, exatamente como abrem o topo do seu cardápio.</p>
                      </div>

                      {/* Composição capa + logo sobreposto */}
                      <div className="relative">
                        {/* Capa (banner) */}
                        <label className="group relative block h-44 w-full cursor-pointer overflow-hidden bg-surface-2">
                          {bannerPreview || store?.banner_url ? (
                            <img
                              src={bannerPreview || store?.banner_url || ''}
                              alt="Capa do cardápio"
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div
                              className="flex h-full flex-col items-center justify-center text-fg-muted-token"
                              style={{ background: 'linear-gradient(135deg, var(--surface-2), var(--surface))' }}
                            >
                              <PhotoIcon className="mb-1.5 h-7 w-7 opacity-70" />
                              <span className="text-sm font-medium">Adicionar capa do cardápio</span>
                              <span className="mt-0.5 text-xs opacity-70">1200 × 400px</span>
                            </div>
                          )}
                          {/* scrim inferior p/ legibilidade do logo/nome */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          {/* realce no hover/foco com o ouro da marca */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-[#1A1613]"
                              style={{ backgroundColor: 'var(--brand)' }}
                            >
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              {bannerFile || store?.banner_url ? 'Trocar capa' : 'Enviar capa'}
                            </span>
                          </div>
                          <input type="file" accept="image/*" className="sr-only" onChange={handleBannerChange} aria-label="Enviar capa do cardápio" />
                        </label>

                        {/* Logo sobreposto à capa (avatar sobre cover) */}
                        <div className="absolute -bottom-10 left-6 z-10">
                          <label
                            className="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-2xl bg-surface-2"
                            style={{ boxShadow: '0 0 0 4px var(--surface), 0 10px 26px -10px rgba(0,0,0,.5)' }}
                          >
                            {logoPreview || store?.logo_url ? (
                              <img
                                src={logoPreview || store?.logo_url || ''}
                                alt="Logo da loja"
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center text-fg-muted-token">
                                <span className="text-2xl">🏪</span>
                                <span className="mt-0.5 text-badge font-medium">Logo</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                              <ArrowUpTrayIcon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                            </div>
                            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoChange} aria-label="Enviar logo da loja" />
                          </label>
                        </div>
                      </div>

                      {/* Nome da loja + acento da cor primária + ações contextuais */}
                      <div className="flex items-end justify-between gap-4 pb-5 pl-32 pr-6 pt-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: HEX_COLOR_RE.test(form.primary_color) ? form.primary_color : 'var(--brand)' }} />
                            <h3 className="truncate font-display text-base text-fg-token">{store?.name || 'Sua loja'}</h3>
                          </div>
                          <p className="mt-1 text-xs text-fg-muted-token">PNG ou JPG. Capa 1200×400px, logo 400×400px.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 pb-0.5">
                          {logoPreview && (
                            <button type="button" onClick={clearLogo} className="text-xs text-fg-muted-token transition-colors hover:text-[var(--danger)]">Remover logo</button>
                          )}
                          {bannerPreview && (
                            <button type="button" onClick={clearBanner} className="text-xs text-fg-muted-token transition-colors hover:text-[var(--danger)]">Remover capa</button>
                          )}
                        </div>
                      </div>
                    </Card>

                    <Secao titulo="Template">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {templates.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            title={t.description}
                            onClick={() => mudarForm({ template: t.id })}
                            className={`p-4 rounded border-2 text-left transition-all ${
                              form.template === t.id
                                ? 'border-brand bg-brand-soft'
                                : 'border-border-token hover:bg-surface-2'
                            }`}
                          >
                            <div className="text-2xl mb-2">{t.preview}</div>
                            <div className="font-semibold text-sm text-fg-token">{t.label}</div>
                          </button>
                        ))}
                      </div>
                    </Secao>

                    <Secao titulo="Cores da marca">
                      <div className="grid grid-cols-2 gap-4">
                        {([
                          ['primary_color', 'Cor primária'],
                          ['secondary_color', 'Cor secundária'],
                        ] as const).map(([campo, rotulo]) => (
                          <label key={campo} className="block">
                            <span className="text-sm text-fg-muted-token">{rotulo}</span>
                            <div className="mt-1 flex items-center gap-3">
                              <input
                                type="color"
                                aria-label={rotulo}
                                value={HEX_COLOR_RE.test(form[campo]) ? form[campo] : '#000000'}
                                onChange={e => mudarForm({ [campo]: e.target.value })}
                                className="w-10 h-10 rounded cursor-pointer border border-border-token"
                              />
                              <input
                                type="text"
                                value={form[campo]}
                                onChange={e => mudarForm({ [campo]: e.target.value })}
                                className="flex-1 rounded border border-border-token bg-surface text-fg-token px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                                maxLength={7}
                              />
                            </div>
                          </label>
                        ))}
                      </div>
                    </Secao>

                    <Secao titulo="Frase do topo">
                      <Input
                        label={`Frase (${form.tagline.length}/200)`}
                        value={form.tagline}
                        onChange={e => mudarForm({ tagline: e.target.value })}
                        placeholder="Ex: Saladas frescas todo dia"
                        maxLength={200}
                      />
                    </Secao>
                  </>
                )}

                {aba === 'cardapio' && (
                  <>
                    <ExibicaoDoCardapioSection
                      valor={exibicao}
                      gravado={exibicaoGravada}
                      onMudar={mudarExibicao}
                      onFocar={focar}
                      amostra={amostra}
                      logoUrl={logoAtual}
                      nomeDaLoja={store.name}
                    />
                    {erroDaExibicao && <p role="alert" className="text-sm text-danger-token">{erroDaExibicao}</p>}
                  </>
                )}

                {aba === 'banners' && store.id && <BannersSection storeId={store.id} />}

                {aba === 'endereco' && (
                  <Secao titulo="Domínio próprio">
                    <Input
                      label="Domínio"
                      value={form.custom_domain}
                      onChange={e => mudarForm({ custom_domain: e.target.value })}
                      placeholder="loja.com.br"
                    />
                    <p className="mt-2 text-caption text-fg-muted-token">
                      Sem domínio: cardapidex.com.br/{store.slug}
                    </p>
                  </Secao>
                )}
              </div>
            )}
          </PageTabs>

          <BarraDeAlteracoes
            quantidade={quantidadeDeAlteracoes}
            salvando={saving}
            onSalvar={() => void salvar()}
            onDescartar={descartar}
          />
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <PhonePreview
            key={geracaoDaPrevia}
            url={urlPreview || ''}
            titulo="Como o cliente vê"
            aoVivo
            iframeRef={registrarIframe}
            dispositivo={dispositivo}
            onDispositivo={setDispositivo}
            rodape={
              urlPublica ? (
                <code className="text-caption text-fg-muted-token">{urlPublica}</code>
              ) : null
            }
          />
        </aside>
      </div>
    </PageShell>
  );
};

export default StorefrontPage;
