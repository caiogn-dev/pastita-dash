import React, { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

import { getStore, updateStore, updateStoreWithFiles, type Store } from '../../services/storesApi';
import { getErrorMessage } from '../../services';
import { useStore } from '../../hooks';
import { usePreviaAoVivo, type AreaDaPrevia } from '../../hooks/usePreviaAoVivo';
import { buildStorefrontUrl, buildStorefrontPreviewUrl } from '../../utils/storefrontUrl';
import { cn } from '../../utils/cn';
import { BarraDeAlteracoes, PageShell, PhonePreview, type Dispositivo } from '../../components/ui';
import { buscarTemplates, TEMPLATES_DE_EMERGENCIA, type TemplateDoCardapio } from './templatesDoCardapio';
import InspetorDaVitrine from './InspetorDaVitrine';
import {
  PARTES,
  PARTE_DA_AREA,
  PARTE_PADRAO,
  definicaoDa,
  ehParte,
  parteMudou,
  type FormDaVitrine,
  type Parte,
} from './partesDaVitrine';
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
 * O template é `string`, não uma união fechada: os templates vêm do backend
 * (`GET /stores/templates/`), e uma união escrita aqui obrigaria deploy do
 * painel a cada template novo — que foi exatamente como o `banquete` ficou
 * invisível nesta tela.
 */
const DEFAULT_FORM: FormDaVitrine = {
  template: 'fresh',
  primary_color: '#2D6A4F',
  secondary_color: '#1B4332',
  tagline: '',
  custom_domain: '',
};

/** Espelha a loja persistida no formato do formulário. Fonte única usada tanto
 *  na carga quanto no rollback do save — o rascunho nunca deve divergir do que
 *  o backend realmente guardou. */
const formFromStore = (data: Store): FormDaVitrine => ({
  template: data.template || DEFAULT_FORM.template,
  primary_color: data.primary_color || DEFAULT_FORM.primary_color,
  secondary_color: data.secondary_color || DEFAULT_FORM.secondary_color,
  tagline: data.tagline || DEFAULT_FORM.tagline,
  custom_domain: data.custom_domain || DEFAULT_FORM.custom_domain,
});

const mensagemDoErro = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || getErrorMessage(e)
  || 'Não consegui salvar. Nada foi alterado.';

/** Botão de ferramenta da barra de cima (mesmo desenho do designer de etiqueta). */
const Ferramenta: React.FC<{ rotulo: string; ativo?: boolean; onClick: () => void; children: React.ReactNode }> = ({
  rotulo, ativo, onClick, children,
}) => (
  <button
    type="button"
    title={rotulo}
    aria-label={rotulo}
    aria-pressed={ativo}
    onClick={onClick}
    className={cn(
      'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      ativo ? 'bg-brand-soft text-brand-ink' : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
    )}
  >
    {children}
  </button>
);

const Separador: React.FC = () => <span className="mx-1 h-5 w-px bg-border-token" aria-hidden />;

/** Tela de "pedido feito" por cima da prévia — ela precisa de um pedido real para existir. */
const TelaDePedidoFeito: React.FC<{ titulo: string; mensagem: string }> = ({ titulo, mensagem }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
    <CheckCircleIcon className="h-16 w-16 text-success-token" aria-hidden />
    <p className="text-lead font-semibold text-fg-token">{titulo}</p>
    <p className="max-w-xs text-body text-fg-muted-token">{mensagem}</p>
  </div>
);

/**
 * Storefront — editor da vitrine em três colunas (13/10).
 *
 * Padrão de editor de tema (Shopify) e de ferramenta de desenho (Figma,
 * Framer): partes da vitrine à esquerda, a vitrine DE VERDADE no meio — muda
 * a cada clique, antes de salvar —, propriedades da parte escolhida à
 * direita. Clicar numa parte da prévia abre a configuração dela (inspetor).
 * Um salvar só, na barra de cima, que só aparece com alteração.
 *
 * Antes era uma página vertical: abas, cartões empilhados e a prévia num
 * canto, mudando só depois de gravar.
 */
export const StorefrontPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();
  const [params, setParams] = useSearchParams();

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
  const [inspetorLigado, setInspetorLigado] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  // Os templates vêm do backend. Começa no fallback para a tela nunca abrir
  // sem opção nenhuma — aparência vazia é pior que lista de emergência.
  const [templates, setTemplates] = useState<TemplateDoCardapio[]>(TEMPLATES_DE_EMERGENCIA);
  const [form, setForm] = useState<FormDaVitrine>(DEFAULT_FORM);

  const [exibicaoGravada, setExibicaoGravada] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [exibicao, setExibicao] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [erroDaExibicao, setErroDaExibicao] = useState('');
  const [amostra, setAmostra] = useState<AmostraDoCardapio | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  // A parte aberta vive na URL (?parte=): recarregar não perde o lugar.
  const parteDaUrl = params.get('parte');
  const parte: Parte = ehParte(parteDaUrl) ? parteDaUrl : PARTE_PADRAO;
  const definicao = definicaoDa(parte);

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

  // Exibição e um produto de verdade (para a amostra do "ver mais").
  const slug = store?.slug || '';
  useEffect(() => {
    if (!slug) return undefined;
    let vivo = true;
    exibicaoDoCardapioService.ler(slug)
      .then((e) => { if (vivo) { setExibicaoGravada(e); setExibicao(e); } })
      .catch((e) => console.error('[StorefrontPage] exibição:', e));
    catalogoDaLojaService.ler(slug)
      .then((c) => { if (vivo) setAmostra(escolherAmostra(c)); })
      .catch(() => { /* sem amostra, usa um texto de exemplo */ });
    return () => { vivo = false; };
  }, [slug]);

  const irParaParte = useCallback((nova: Parte) => {
    const next = new URLSearchParams(params);
    next.set('parte', nova);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const urlPublica = store ? buildStorefrontUrl(store) : null;
  // O iframe aponta para /preview/{slug}, não para a loja: a loja leva ao
  // checkout e por isso continua bloqueada para enquadramento.
  const urlPreview = store ? buildStorefrontPreviewUrl(store) : null;
  const { registrarIframe, enviarRascunho, focar, inspecionar } = usePreviaAoVivo(urlPreview || '', {
    // Clicou numa parte da prévia: abre a configuração dela.
    onSelecionar: (area: AreaDaPrevia) => irParaParte(PARTE_DA_AREA[area]),
  });

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

  useEffect(() => { if (store) inspecionar(inspetorLigado); }, [store, inspetorLigado, inspecionar]);

  // Abrir uma parte leva a prévia até ela.
  useEffect(() => {
    if (store && definicao.area) focar(definicao.area);
  }, [store, definicao.area, focar]);

  const escolherImagem = (tipo: 'logo' | 'capa') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, tipo === 'logo' ? MAX_LOGO_SIZE : MAX_BANNER_SIZE);
    if (err) { toast.error(err); e.target.value = ''; return; }
    const ref = tipo === 'logo' ? logoBlobRef : bannerBlobRef;
    if (ref.current) URL.revokeObjectURL(ref.current);
    const url = URL.createObjectURL(file);
    ref.current = url;
    if (tipo === 'logo') { setLogoFile(file); setLogoPreview(url); } else { setBannerFile(file); setBannerPreview(url); }
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

  const mudarForm = (parcial: Partial<FormDaVitrine>) => setForm((f) => ({ ...f, ...parcial }));
  const mudarExibicao = (parcial: Partial<ExibicaoDoCardapio>) => {
    setExibicao((e) => ({ ...e, ...parcial }));
    setErroDaExibicao('');
    if (definicao.area) focar(definicao.area);
  };

  // O que difere do que está gravado — conta para a barra de salvar.
  const formSalvo = useMemo(() => (store ? formFromStore(store) : DEFAULT_FORM), [store]);
  const camposDaLojaMudados = (Object.keys(form) as (keyof FormDaVitrine)[]).filter((k) => form[k] !== formSalvo[k]);
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
      toast.error('Cor principal inválida. Use o formato #RRGGBB.');
      return;
    }
    if (!HEX_COLOR_RE.test(form.secondary_color)) {
      toast.error('Cor de destaque inválida. Use o formato #RRGGBB.');
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
          // otimista (template destacado, cores, domínio) permanecia na tela dando
          // a impressão de que salvou. Volta ao que a loja tem de fato.
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
        toast.success('Aparência publicada');
        setGeracaoDaPrevia((g) => g + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6 text-fg-muted-token">Carregando...</div>;

  const temArquivo = Boolean(logoFile || bannerFile);
  const Icone = definicao.icone;

  return (
    <PageShell
      variante="quadro"
      titulo="Aparência da loja"
      acoes={
        <div className="flex flex-wrap items-center gap-1">
          <Ferramenta rotulo="Celular" ativo={dispositivo === 'celular'} onClick={() => setDispositivo('celular')}>
            <DevicePhoneMobileIcon className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Computador" ativo={dispositivo === 'computador'} onClick={() => setDispositivo('computador')}>
            <ComputerDesktopIcon className="h-4 w-4" />
          </Ferramenta>
          <Separador />
          {quantidadeDeAlteracoes > 0 ? (
            <BarraDeAlteracoes
              embutida
              quantidade={quantidadeDeAlteracoes}
              salvando={saving}
              onSalvar={() => void salvar()}
              onDescartar={descartar}
              rotuloSalvar="Publicar"
            />
          ) : (
            <span className="flex items-center gap-1.5 px-2 text-caption text-fg-muted-token">
              <CheckCircleIcon className="h-4 w-4 text-success-token" aria-hidden />
              Publicado
            </span>
          )}
          {urlPublica && (
            <a
              href={urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex h-8 items-center gap-1 rounded-lg border border-border-token px-3 text-body font-medium text-fg-token hover:bg-surface-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
              Ver loja
            </a>
          )}
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[210px_minmax(0,1fr)_340px]">
        {/* ── esquerda: partes da vitrine ── */}
        <nav
          aria-label="Partes da vitrine"
          className="superficie flex gap-1 overflow-x-auto p-1.5 max-xl:col-span-full xl:flex-col xl:overflow-y-auto xl:p-2"
        >
          {PARTES.map((p) => {
            const IconeDaParte = p.icone;
            const ativa = p.id === parte;
            const pendente = parteMudou(p, form, formSalvo, exibicao, exibicaoGravada, temArquivo);
            return (
              <Fragment key={p.id}>
                {p.grupo && (
                  <span className="hidden px-2.5 pb-1 pt-3 text-overline font-semibold uppercase tracking-wide text-fg-muted-token first:pt-1 xl:block">
                    {p.grupo}
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => irParaParte(p.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-body transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    ativa ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                  )}
                >
                  <IconeDaParte className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate">{p.rotulo}</span>
                  {pendente && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Alterado, ainda não salvo" />
                  )}
                </button>
              </Fragment>
            );
          })}
        </nav>

        {/* ── meio: a vitrine de verdade ── */}
        <section
          aria-label="Prévia da vitrine"
          className="flex min-h-[620px] min-w-0 flex-col rounded-xl bg-surface-2 p-3 max-lg:order-last lg:min-h-0"
        >
          <PhonePreview
            key={geracaoDaPrevia}
            url={urlPreview || ''}
            titulo="Como o cliente vê"
            aoVivo
            preencher
            iframeRef={registrarIframe}
            dispositivo={dispositivo}
            acoesExtras={
              <Ferramenta
                rotulo="Inspecionar: clique numa parte da prévia para editar"
                ativo={inspetorLigado}
                onClick={() => setInspetorLigado((v) => !v)}
              >
                <CursorArrowRaysIcon className="h-4 w-4" />
              </Ferramenta>
            }
            sobreposicao={parte === 'pedido' ? (
              <TelaDePedidoFeito
                titulo={exibicao.agradecimento_titulo.trim() || 'Pedido confirmado!'}
                mensagem={exibicao.agradecimento_subtitulo.trim() || 'Seu pedido foi processado com sucesso.'}
              />
            ) : undefined}
          />
        </section>

        {/* ── direita: propriedades da parte escolhida ── */}
        <aside aria-label={definicao.rotulo} className="superficie flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-border-token px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-ink" aria-hidden>
              <Icone className="h-[18px] w-[18px]" />
            </span>
            <h2 className="text-base font-semibold text-fg-token">{definicao.rotulo}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <InspetorDaVitrine
              parte={parte}
              form={form}
              formSalvo={formSalvo}
              mudarForm={mudarForm}
              exibicao={exibicao}
              exibicaoSalva={exibicaoGravada}
              mudarExibicao={mudarExibicao}
              templates={templates}
              loja={store}
              logo={{ url: logoPreview || store.logo_url || '', pendente: Boolean(logoFile), onEscolher: escolherImagem('logo'), onRemover: clearLogo }}
              capa={{ url: bannerPreview || store.banner_url || '', pendente: Boolean(bannerFile), onEscolher: escolherImagem('capa'), onRemover: clearBanner }}
              amostra={amostra}
              urlPublica={urlPublica}
              onBannersMudaram={() => setGeracaoDaPrevia((g) => g + 1)}
            />
            {erroDaExibicao && <p role="alert" className="mt-4 text-sm text-danger-token">{erroDaExibicao}</p>}
          </div>
        </aside>
      </div>
    </PageShell>
  );
};

export default StorefrontPage;
