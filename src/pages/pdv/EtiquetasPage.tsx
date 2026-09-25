import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, SearchInput, Select, ChoiceCards, FormSummary } from '../../components/ui';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Loading } from '../../components/common';
import { getStores, getProducts, gerarCodigosInternos, StoreProduct } from '../../services/storesApi';
import api, { normalizePaginatedResponse } from '../../services/api';
import {
  buildBarcodeCatalogDoc, buildNutritionDoc, buildNutritionQrDoc, buildProdutoDoc, buildValidadeDoc, printHtmlDocument, validadeMargin,
  PRODUTO_DEFAULTS, VALIDADE_DEFAULTS, ProdutoConfig, ValidadeConfig, LabelBorder,
} from '../../utils/labelPrint';
import { precoVigenteDoProduto } from '../../utils/precoVigente';
import { PageShell } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import { useAdicional } from '../../hooks/useAdicional';
import { ADICIONAL_ETIQUETA } from '../../services/billing';
import { AdicionalBloqueado } from '../../components/billing/AdicionalBloqueado';
import { enviarEtiquetasParaAgente, imprimeEtiquetas, listPrintAgents, PrintAgent } from '../../services/printing';

const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');
const MM_PX = 96 / 25.4;

type Template = 'produto' | 'validade' | 'nutricao' | 'nutricao-qr';

interface NutritionProfile {
  product: string; serving_size_g: string; household_measure?: string;
  public_url?: string;
  calculation?: {
    per_100g?: Record<string, string | number | null>;
    /** Arredondados pela IN 75/2020 — é o que vai impresso. */
    label_per_100g?: Record<string, string | number | null>;
    label_per_serving?: Record<string, string | number | null>;
    missing_nutrients?: string[];
    /** Vazio quando algum ingrediente ainda não teve alergênico revisado. */
    allergens?: { texto?: string; revisado?: boolean };
    /** `conclusivo:false` = falta dado para afirmar que não leva selo. */
    front_of_pack?: { texto?: string[]; conclusivo?: boolean };
  } | null;
  [key: string]: unknown;
}

interface CatalogEntry {
  product: StoreProduct;
  storeSlug: string;
  storeName: string;
}

const PRODUTO_PRESETS = [
  { label: '100 × 80 mm', width: 100, height: 80 },
  { label: '100 × 100 mm', width: 100, height: 100 },
];

const CFG_KEY = 'cdx-etiquetas-cfg-v2';

const OPCOES_DE_BORDA = [
  { valor: 'none', rotulo: 'Sem borda' },
  { valor: 'solid', rotulo: 'Retângulo' },
  { valor: 'dashed', rotulo: 'Tracejada' },
];

const BorderSelect: React.FC<{ value: LabelBorder; onChange: (v: LabelBorder) => void }> = ({ value, onChange }) => (
  <Select
    rotulo="Borda"
    opcoes={OPCOES_DE_BORDA}
    valor={value}
    onMudar={(v) => onChange(v as LabelBorder)}
    data-testid="etq-border"
  />
);

interface SavedConfig { produto: ProdutoConfig; validade: ValidadeConfig; shelfDays: number; }

const loadConfig = (): SavedConfig => {
  const base: SavedConfig = { produto: { ...PRODUTO_DEFAULTS }, validade: { ...VALIDADE_DEFAULTS }, shelfDays: 5 };
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<SavedConfig>;
    return {
      produto: { ...base.produto, ...(saved.produto ?? {}) },
      validade: { ...base.validade, ...(saved.validade ?? {}) },
      shelfDays: saved.shelfDays ?? base.shelfDays,
    };
  } catch {
    return base;
  }
};

const NumField: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; testId?: string;
}> = ({ label, value, onChange, min = 0, max = 300, step = 0.5, suffix = 'mm', testId }) => {
  // Texto local: corrigir a faixa a cada tecla impedia digitar. Com mínimo 15,
  // o "3" de "33" virava 15 antes do segundo dígito. A faixa vale ao sair.
  const [texto, setTexto] = useState(String(value));
  useEffect(() => { setTexto(String(value)); }, [value]);
  const confirmar = () => {
    const n = Number(texto.replace(',', '.'));
    const corrigido = Number.isFinite(n) && texto.trim() !== '' ? Math.min(max, Math.max(min, n)) : value;
    setTexto(String(corrigido));
    if (corrigido !== value) onChange(corrigido);
  };
  const id = `num-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <label htmlFor={id} className="text-fg-muted-token">{label}</label>
      <span className="flex items-center gap-1.5">
        <input
          id={id}
          type="number" inputMode="decimal" min={min} max={max} step={step}
          className="controle h-9 w-24 px-2 text-right tabular-nums"
          value={texto}
          data-testid={testId}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }}
        />
        {suffix && <span className="text-fg-muted-token text-xs whitespace-nowrap">{suffix}</span>}
      </span>
    </div>
  );
};

const EtiquetasPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Nasce na loja da rota, não em "todas". A bancada de etiquetas é de UMA
  // loja: abrir com o catálogo das doze misturado faz o operador procurar o
  // produto dele no meio do produto dos outros — e imprimir errado é papel,
  // fita e um pote com a etiqueta de outra cozinha. "Todas as lojas" continua
  // disponível no seletor para quem opera mais de uma no mesmo balcão.
  const [storeFilter, setStoreFilter] = useState<string>(storeId ?? 'all');
  const [qty, setQty] = useState<Map<string, number>>(new Map());
  const [template, setTemplate] = useState<Template>('produto');
  // Folha compacta: 4 colunas em vez de 2. Com muitas lojas e produtos, o que
  // importa é caber a operação inteira em poucas folhas.
  const [catalogoCompacto, setCatalogoCompacto] = useState(true);
  // A folha carregava TODAS as lojas ativas e imprimia tudo junto. Quem tem
  // muitas lojas quase nunca quer isso: quer a folha de uma operação.
  const [lojaDaFolha, setLojaDaFolha] = useState<string>(storeId || '');
  // Categorias escolhidas. Vazio = todas — é o estado inicial e o mais óbvio;
  // marcar é restringir.
  const [categoriasDaFolha, setCategoriasDaFolha] = useState<Set<string>>(new Set());
  const [cfg, setCfg] = useState<SavedConfig>(loadConfig);
  const [preparing, setPreparing] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, NutritionProfile>>(new Map());
  // Agents (programa de impressão) por loja. Só interessa quem está marcado
  // com "etiquetas" na tela de Impressão: ZPL na Epson sai como lixo. Sem
  // agent, o bloco nem aparece e a impressão pelo navegador segue igual.
  const [agentes, setAgentes] = useState<Map<string, PrintAgent[]>>(new Map());
  const [agenteEscolhido, setAgenteEscolhido] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  // Produto e validade são de todo mundo; só os modelos de nutrição são o
  // adicional Etiqueta ANVISA.
  const etiqueta = useAdicional(ADICIONAL_ETIQUETA);
  const nutricaoBloqueada = (template === 'nutricao' || template === 'nutricao-qr')
    && etiqueta.estado !== 'carregando' && !etiqueta.liberado;

  useEffect(() => {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* quota/privado */ }
  }, [cfg]);

  const setProduto = (patch: Partial<ProdutoConfig>) =>
    setCfg((p) => ({ ...p, produto: { ...p.produto, ...patch } }));
  const setValidade = (patch: Partial<ValidadeConfig>) =>
    setCfg((p) => ({ ...p, validade: { ...p.validade, ...patch } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let stores: { slug: string; name: string }[] = [];
      try {
        const res = await getStores();
        stores = (res.results || [])
          .filter((s) => s.status === 'active')
          .map((s) => ({ slug: s.slug, name: s.name }));
      } catch { /* opera só com a loja da rota */ }
      if (storeId && !stores.some((s) => s.slug === storeId)) {
        stores.push({ slug: storeId, name: storeId });
      }
      const perStore = await Promise.all(stores.map(async (s) => {
        const all: CatalogEntry[] = [];
        let page = 1;
        for (;;) {
          const res = await getProducts({ store: s.slug, status: 'active', page, page_size: 200 });
          all.push(...res.results.map((product) => ({ product, storeSlug: s.slug, storeName: s.name })));
          if (!res.next) break;
          page += 1;
        }
        return all;
      }));
      setCatalog(perStore.flat());
      try {
        const nutrition = await api.get('/nutrition/profiles/', { params: { page_size: 500 } });
        const rows = normalizePaginatedResponse<NutritionProfile>(nutrition.data);
        setProfiles(new Map(rows.map((profile) => [profile.product, profile])));
      } catch { /* backend antigo: produto/validade continuam funcionando */ }
      try {
        const porLoja = await Promise.all(stores.map(async (s) => {
          const res = await listPrintAgents(s.slug);
          const lista = normalizePaginatedResponse<PrintAgent>(res.data)
            .filter((a) => a.is_active && a.status === 'active' && imprimeEtiquetas(a));
          return [s.slug, lista] as const;
        }));
        setAgentes(new Map(porLoja.filter(([, lista]) => lista.length > 0)));
      } catch { /* sem programa de impressão: o envio remoto só não aparece */ }
    } catch {
      toast.error('Erro ao carregar o catálogo');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const stores = useMemo(() => {
    const seen = new Map<string, string>();
    catalog.forEach((c) => seen.set(c.storeSlug, c.storeName));
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [catalog]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((c) => (
      (storeFilter === 'all' || c.storeSlug === storeFilter)
      && (!term || c.product.name.toLowerCase().includes(term))
    ));
  }, [catalog, search, storeFilter]);

  const selected = useMemo(
    () => catalog.filter((c) => (qty.get(c.product.id) ?? 0) > 0),
    [catalog, qty],
  );
  const totalLabels = selected.reduce((s, c) => s + (qty.get(c.product.id) ?? 0), 0);

  const setProductQty = (id: string, value: number) => {
    setQty((prev) => {
      const next = new Map(prev);
      if (value > 0) next.set(id, Math.min(value, 999));
      else next.delete(id);
      return next;
    });
  };

  const manip = new Date();
  const val = new Date(manip.getTime() + cfg.shelfDays * 24 * 60 * 60 * 1000);

  const produtoLabel = (c: CatalogEntry, barcode?: string) => ({
    name: c.product.name,
    description: c.product.short_description || c.product.description || undefined,
    price: formatCurrency(precoVigenteDoProduto(c.product)),
    barcode: barcode ?? c.product.barcode ?? undefined,
  });

  /** Uma entrada por cópia, na ordem da lista. */
  const expandCopies = <T,>(make: (c: CatalogEntry) => T): T[] => selected.flatMap(
    (c) => Array.from({ length: qty.get(c.product.id) ?? 0 }, () => make(c)),
  );

  /** Mesmo objeto para o navegador e para o envio remoto (o backend vira ZPL). */
  const montarEtiquetasNutricionais = () => expandCopies((c) => {
    const profile = profiles.get(c.product.id);
    if (!profile) return null;
    const calc = profile.calculation;
    // `label_per_100g`/`label_per_serving` já vêm arredondados pela IN
    // 75/2020 (casa por nutriente + regra de zero). Usar `per_100g`, que é
    // o valor cru, imprime "0,04 g" de trans onde a norma manda "0 g".
    const calculated = calc?.label_per_100g ?? calc?.per_100g;
    const keys = ['energy_kcal','carbohydrates_g','total_sugars_g','added_sugars_g','protein_g','total_fat_g','saturated_fat_g','trans_fat_g','fiber_g','sodium_mg'];
    const num = (raw: unknown) => (raw == null || raw === '' ? null : Number(raw));
    const per100g = Object.fromEntries(keys.map((key) => [key, num(calculated?.[key] ?? profile[key])]));
    const porcao = calc?.label_per_serving;
    const perServing = porcao
      ? Object.fromEntries(keys.map((key) => [key, num(porcao[key])]))
      : undefined;
    // Só sai declaração de alergênico se TODOS os ingredientes foram
    // revisados; o backend devolve texto vazio quando não foram.
    const allergens = calc?.allergens?.texto || undefined;
    // Sem os três nutrientes não dá para afirmar que não leva selo, então
    // a lupa só é impressa quando a avaliação foi conclusiva.
    const frontOfPack = calc?.front_of_pack?.conclusivo ? calc.front_of_pack.texto : undefined;
    const publicUrl = profile.public_url;
    return { name: c.product.name, servingG: Number(profile.serving_size_g || 100), householdMeasure: profile.household_measure, per100g, perServing, allergens, frontOfPack, publicUrl };
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));


  const montarEtiquetasDeValidade = () =>
    expandCopies((c) => ({ name: c.product.name, manip: fmtDate(manip), val: fmtDate(val) }));

  // Loja única da seleção: o job é de UMA loja e de UM agent.
  const lojaDaSelecao = useMemo(() => {
    const slugs = new Set(selected.map((c) => c.storeSlug));
    return slugs.size === 1 ? selected[0].storeSlug : null;
  }, [selected]);
  const agentesDaSelecao = lojaDaSelecao ? (agentes.get(lojaDaSelecao) ?? []) : [];
  const envioRemotoDisponivel = template !== 'produto' && !nutricaoBloqueada
    && (lojaDaSelecao ? agentesDaSelecao.length > 0 : agentes.size > 0);
  useEffect(() => {
    if (!agentesDaSelecao.some((a) => a.id === agenteEscolhido)) {
      setAgenteEscolhido(agentesDaSelecao[0]?.id ?? '');
    }
  }, [agentesDaSelecao, agenteEscolhido]);

  const handleEnviarRemoto = async () => {
    if (totalLabels === 0 || enviando || template === 'produto') return;
    if (!lojaDaSelecao) { toast.error('Selecione produtos de uma loja só para enviar à impressora remota.'); return; }
    const agent = agentesDaSelecao.find((a) => a.id === agenteEscolhido);
    if (!agent) { toast.error('Escolha o programa de impressão que está com a Zebra.'); return; }
    setEnviando(true);
    try {
      const etiquetas = template === 'validade' ? montarEtiquetasDeValidade() : montarEtiquetasNutricionais();
      if (template !== 'validade' && etiquetas.length !== totalLabels) {
        toast.error('Alguns produtos selecionados ainda não têm perfil nutricional.');
        return;
      }
      await enviarEtiquetasParaAgente({
        store: selected[0].product.store,
        agent: agent.id,
        modelo: template,
        etiquetas,
        config: template === 'validade' ? { ...cfg.validade } : {},
      });
      toast.success(`${etiquetas.length} etiqueta${etiquetas.length === 1 ? '' : 's'} enviada${etiquetas.length === 1 ? '' : 's'} para ${agent.name} (${agent.printer_name})`);
    } catch {
      toast.error('Não foi possível enviar para a impressora remota');
    } finally {
      setEnviando(false);
    }
  };

  const handlePrint = async () => {
    if (totalLabels === 0 || preparing) return;
    setPreparing(true);
    try {
      const newCodes = new Map<string, string>();
      // Etiqueta de produto sem código → o BACKEND gera o EAN-13 interno.
      // Aqui era sorteado no navegador, o que dava código sem identidade de
      // loja e podia colidir entre dois operadores imprimindo ao mesmo tempo.
      if (template === 'produto') {
        const semCodigo = selected.filter((x) => !x.product.barcode);
        const porLoja = new Map<string, string[]>();
        semCodigo.forEach((c) => {
          const atual = porLoja.get(c.product.store) || [];
          atual.push(c.product.id);
          porLoja.set(c.product.store, atual);
        });
        for (const [storeUuid, ids] of porLoja) {
          const { gerados } = await gerarCodigosInternos(storeUuid, ids);
          Object.entries(gerados).forEach(([id, code]) => newCodes.set(id, code));
        }
        if (newCodes.size > 0) {
          setCatalog((prev) => prev.map((x) => (newCodes.has(x.product.id)
            ? { ...x, product: { ...x.product, barcode: newCodes.get(x.product.id) as string } }
            : x)));
          toast.success(`${newCodes.size} código(s) interno(s) gerado(s) e salvo(s)`);
        }
      }
      const nutritionCopies = montarEtiquetasNutricionais();
      if ((template === 'nutricao' || template === 'nutricao-qr') && nutritionCopies.length !== totalLabels) {
        toast.error('Alguns produtos selecionados ainda não têm perfil nutricional.');
        return;
      }
      const doc = template === 'produto'
        ? buildProdutoDoc(expandCopies((c) => produtoLabel(c, newCodes.get(c.product.id))), cfg.produto)
        : template === 'nutricao' ? buildNutritionDoc(nutritionCopies)
          : template === 'nutricao-qr' ? buildNutritionQrDoc(nutritionCopies) : buildValidadeDoc(
          expandCopies((c) => ({ name: c.product.name, manip: fmtDate(manip), val: fmtDate(val) })),
          cfg.validade,
        );
      await printHtmlDocument(doc);
    } catch {
      toast.error('Erro ao preparar as etiquetas');
    } finally {
      setPreparing(false);
    }
  };

  /** Lojas e categorias existentes no que foi carregado — a lista de escolha
   *  sai do dado real, não de uma constante que envelhece. */
  const lojasDisponiveis = useMemo(() => {
    const m = new Map<string, string>();
    catalog.forEach((e) => m.set(e.storeSlug, e.storeName));
    return [...m].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [catalog]);

  const categoriasDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    catalog.filter((e) => !lojaDaFolha || e.storeSlug === lojaDaFolha)
      .forEach((e) => { if (e.product.category_name) nomes.add(e.product.category_name); });
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [catalog, lojaDaFolha]);

  const daFolha = useMemo(() => catalog.filter((e) => (
    (!lojaDaFolha || e.storeSlug === lojaDaFolha)
    && (!categoriasDaFolha.size || categoriasDaFolha.has(e.product.category_name || ''))
  )), [catalog, lojaDaFolha, categoriasDaFolha]);

  const handleExportPdf = async () => {
    const grouped = new Map<string, { name: string; products: CatalogEntry[] }>();
    daFolha.forEach((entry) => {
      const group = grouped.get(entry.storeSlug) ?? { name: entry.storeName, products: [] };
      group.products.push(entry);
      grouped.set(entry.storeSlug, group);
    });
    const storesForPdf = [...grouped.values()]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((group) => ({
        name: group.name,
        products: [...group.products]
          .sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR'))
          .map(({ product }) => ({
            name: product.name,
            category: product.category_name || undefined,
            sku: product.sku || undefined,
            barcode: product.barcode || undefined,
            price: precoVigenteDoProduto(product) ?? undefined,
          })),
      }));
    await printHtmlDocument(buildBarcodeCatalogDoc(storesForPdf, { compacto: catalogoCompacto }));
  };

  /** Primeira página, renderizada com o mesmo gerador da impressão. */
  const preview = useMemo(() => {
    if (template === 'produto') {
      const sample = selected[0]
        ? produtoLabel(selected[0])
        : { name: 'Produto de exemplo', description: 'Descrição', price: formatCurrency(19.9), barcode: '2000000000008' };
      const p = cfg.produto;
      const paper = Math.max(p.paperW, p.width);
      return {
        doc: buildProdutoDoc([sample], p),
        w: (p.rotate ? p.height : paper) * MM_PX,
        h: (p.rotate ? paper : p.height) * MM_PX,
      };
    }
    if (template === 'nutricao') {
      const sample = { name: selected[0]?.product.name || 'Prato de exemplo', servingG: 350, householdMeasure: '1 unidade', publicUrl:'https://backend.pastita.com.br/api/v1/nutrition/public/00000000-0000-0000-0000-000000000000/', per100g: { energy_kcal:128, carbohydrates_g:28.1,total_sugars_g:null,added_sugars_g:0,protein_g:8.5,total_fat_g:4.2,saturated_fat_g:1.1,trans_fat_g:0,fiber_g:3.2,sodium_mg:210 } };
      return { doc: buildNutritionDoc([sample]), w: 100 * MM_PX, h: 80 * MM_PX };
    }
    if (template === 'nutricao-qr') {
      const sample = { name: selected[0]?.product.name || 'Prato de exemplo', servingG: 100, publicUrl:'https://backend.pastita.com.br/api/v1/nutrition/public/00000000-0000-0000-0000-000000000000/', per100g:{} };
      return { doc: buildNutritionQrDoc([sample]), w: 30 * MM_PX, h: 22 * MM_PX };
    }
    const v = cfg.validade;
    const dates = { manip: fmtDate(manip), val: fmtDate(val) };
    const row = selected.length > 0
      ? selected.slice(0, v.cols).map((c) => ({ name: c.product.name, ...dates }))
      : Array.from({ length: v.cols }, (_, i) => ({ name: `Produto ${i + 1}`, ...dates }));
    return { doc: buildValidadeDoc(row, v), w: v.paperW * MM_PX, h: v.labelH * MM_PX };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, cfg, selected, cfg.shelfDays]);
  const previewScale = Math.min(352 / preview.w, 1);

  if (loading) return <Loading />;

  const MODELOS = [
    { valor: 'produto' as Template, titulo: 'Produto (Zebra)', descricao: 'Nome, preço e código de barras. 100 × 80 mm.' },
    { valor: 'validade' as Template, titulo: 'Validade (Elgin)', descricao: 'Manipulação e validade, em colunas no rolo.' },
    { valor: 'nutricao' as Template, titulo: 'Nutrição 100×80', descricao: 'Tabela ANVISA completa com QR Code.' },
    { valor: 'nutricao-qr' as Template, titulo: 'QR Nutrição 30×22', descricao: 'Para pote pequeno: o QR abre a tabela.' },
  ];
  const nomeDoModelo = MODELOS.find((m) => m.valor === template)?.titulo ?? template;
  const produtosSelecionados = selected.length;

  return (
    <PageShell
      titulo="Etiquetas"
      descricao="Escolha o modelo, marque quantas etiquetas de cada produto e imprima."
      acoes={
        <div className="flex flex-col items-stretch gap-2 sm:min-w-80">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              rotuloOculto="Loja da folha de códigos"
              opcoes={lojasDisponiveis.map((l) => ({ valor: l.slug, rotulo: l.name }))}
              vazio="Todas as lojas"
              valor={lojaDaFolha}
              onMudar={(v) => { setLojaDaFolha(v); setCategoriasDaFolha(new Set()); }}
            />
            <Button variant="secondary" disabled={daFolha.length === 0} onClick={handleExportPdf}>
              <ArrowDownTrayIcon className="w-5 h-5" />
              Folha de códigos ({daFolha.length})
            </Button>
          </div>
          {categoriasDisponiveis.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {categoriasDisponiveis.map((c) => {
                const on = categoriasDaFolha.has(c);
                return (
                  <button key={c} type="button" aria-pressed={on}
                    onClick={() => setCategoriasDaFolha((s) => {
                      const novo = new Set(s);
                      if (novo.has(c)) novo.delete(c); else novo.add(c);
                      return novo;
                    })}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-border-token text-fg-muted-token hover:text-fg-token'}`}>
                    {c}
                  </button>
                );
              })}
              {categoriasDaFolha.size > 0 && (
                <button type="button" className="px-2 py-0.5 text-xs text-fg-muted-token underline"
                  onClick={() => setCategoriasDaFolha(new Set())}>limpar</button>
              )}
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs text-fg-muted-token">
            <input type="checkbox" checked={catalogoCompacto}
              onChange={(e) => setCatalogoCompacto(e.target.checked)} />
            Folha compacta: nome, código e preço, 4 por linha
          </label>
        </div>
      }
    >

      <div className="grid lg:grid-cols-[1fr,400px] gap-4 md:gap-5 items-start">
        <div className="space-y-4 md:space-y-5">
        <Card className="p-4 sm:p-5">
          <ChoiceCards<Template>
            rotulo="Qual etiqueta"
            opcoes={MODELOS}
            valor={template}
            onChange={setTemplate}
          />
        </Card>

        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-fg-token">Produtos e quantidades</h2>
              <p className="text-xs text-fg-muted-token">
                {totalLabels === 0
                  ? 'Digite quantas etiquetas quer de cada produto.'
                  : `${produtosSelecionados} produto${produtosSelecionados === 1 ? '' : 's'} · ${totalLabels} etiqueta${totalLabels === 1 ? '' : 's'}`}
              </p>
            </div>
            {totalLabels > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setQty(new Map())}>Limpar seleção</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-48">
              <SearchInput
                placeholder="Buscar produto…"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            {stores.length > 1 && (
              <Select
                rotuloOculto="Filtrar por loja"
                opcoes={stores.map((s) => ({ valor: s.slug, rotulo: s.name }))}
                vazio="Todas as lojas"
                valor={storeFilter === 'all' ? '' : storeFilter}
                onMudar={(v) => setStoreFilter(v || 'all')}
              />
            )}
          </div>
          <ul className="divide-y divide-[color:var(--border)] max-h-[30rem] overflow-y-auto -mx-1" data-testid="etq-produtos">
            {visible.map((c) => {
              const n = qty.get(c.product.id) ?? 0;
              return (
                <li key={c.product.id} className={`flex items-center gap-3 px-1 py-2.5 ${n > 0 ? 'bg-brand/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-fg-token">{c.product.name}</div>
                    <div className="text-xs text-fg-muted-token">
                      {stores.length > 1 && `${c.storeName} · `}
                      {formatCurrency(precoVigenteDoProduto(c.product))}
                      {c.product.barcode ? ` · ${c.product.barcode}` : ' · sem código (gera na impressão)'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Menos uma etiqueta de ${c.product.name}`}
                      disabled={n === 0} onClick={() => setProductQty(c.product.id, n - 1)}>
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                    <input
                      type="number" inputMode="numeric" min={0} max={999}
                      className="controle h-9 w-16 px-1 text-center tabular-nums"
                      value={n}
                      onChange={(e) => setProductQty(c.product.id, Number(e.target.value) || 0)}
                      aria-label={`Quantidade de etiquetas de ${c.product.name}`}
                    />
                    <Button variant="ghost" size="sm" aria-label={`Mais uma etiqueta de ${c.product.name}`}
                      onClick={() => setProductQty(c.product.id, n + 1)}>
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="py-8 text-center text-sm text-fg-muted-token">Nenhum produto encontrado</li>
            )}
          </ul>
        </Card>

        <Card className="p-4 sm:p-5 space-y-4">
          {template === 'produto' ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-fg-token">Papel</h3>
              <div className="flex flex-wrap gap-2">
                {PRODUTO_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant={cfg.produto.width === p.width && cfg.produto.height === p.height ? 'primary' : 'secondary'}
                    onClick={() => setProduto({ width: p.width, height: p.height, paperW: p.width })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <NumField label="Etiqueta (largura)" value={cfg.produto.width} min={20} max={200} onChange={(v) => setProduto({ width: v })} />
              <NumField label="Etiqueta (altura)" value={cfg.produto.height} min={15} max={200} onChange={(v) => setProduto({ height: v })} />
              <NumField label="Largura do papel" value={cfg.produto.paperW} min={20} max={220} onChange={(v) => setProduto({ paperW: v })} />
              {cfg.produto.paperW > cfg.produto.width && (
                <p className="text-xs text-fg-muted-token">
                  Etiqueta centralizada: {((cfg.produto.paperW - cfg.produto.width) / 2).toFixed(1)} mm de margem por lado.
                </p>
              )}
              <BorderSelect value={cfg.produto.border} onChange={(v) => setProduto({ border: v })} />
              <div className="space-y-1.5 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.produto.rotate}
                    onChange={(e) => setProduto({ rotate: e.target.checked })} data-testid="etq-rotate" />
                  Girar 90° (se sair torta ou rotacionada no driver)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.produto.showPrice} onChange={(e) => setProduto({ showPrice: e.target.checked })} />
                  Mostrar preço
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.produto.showDesc} onChange={(e) => setProduto({ showDesc: e.target.checked })} />
                  Mostrar descrição e ingredientes
                </label>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-fg-muted-token">Calibração fina</summary>
                <div className="space-y-2 mt-2">
                  <NumField label="Deslocar horizontal" value={cfg.produto.offsetX} min={-20} max={20} onChange={(v) => setProduto({ offsetX: v })} />
                  <NumField label="Deslocar vertical" value={cfg.produto.offsetY} min={-20} max={20} onChange={(v) => setProduto({ offsetY: v })} />
                </div>
              </details>
            </section>
          ) : nutricaoBloqueada ? (
            <AdicionalBloqueado etiqueta={etiqueta} />
          ) : template === 'nutricao' || template === 'nutricao-qr' ? (
            <section className="rounded-lg border border-border-token bg-surface p-3 text-sm space-y-1.5">
              <p className="font-semibold text-fg-token">{template === 'nutricao' ? 'Zebra, 100 × 80 mm' : 'QR compacto, 30 × 22 mm'}</p>
              <p className="text-fg-muted-token">{template === 'nutricao' ? 'Tabela completa: por 100 g, por porção, %VD, alergênicos e QR Code.' : 'Para embalagens pequenas: o QR abre a tabela nutricional completa no celular.'}</p>
              <p className="text-xs text-fg-muted-token">Os valores vêm da receita de cada produto, em Cardápio → Ingredientes e TACO.</p>
            </section>
          ) : (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-fg-token">Validade e papel</h3>
              <NumField
                label="Validade em" suffix={`dias → ${fmtDate(val)}`} min={1} max={365} step={1}
                value={cfg.shelfDays} testId="etq-shelf-days"
                onChange={(v) => setCfg((p) => ({ ...p, shelfDays: v }))}
              />
              <NumField label="Colunas" suffix="" min={1} max={6} step={1} value={cfg.validade.cols} onChange={(v) => setValidade({ cols: v })} />
              <NumField label="Etiqueta (largura)" value={cfg.validade.labelW} min={15} max={80} onChange={(v) => setValidade({ labelW: v })} />
              <NumField label="Etiqueta (altura)" value={cfg.validade.labelH} min={10} max={60} onChange={(v) => setValidade({ labelH: v })} />
              <NumField label="Vão entre colunas" value={cfg.validade.gap} min={0} max={10} onChange={(v) => setValidade({ gap: v })} />
              <NumField label="Largura do papel" value={cfg.validade.paperW} min={30} max={120} onChange={(v) => setValidade({ paperW: v })} />
              <p className="text-xs text-fg-muted-token">
                Colunas centralizadas no papel: {validadeMargin(cfg.validade).toFixed(1)} mm de margem por lado
                ({cfg.validade.cols}×{cfg.validade.labelW} + {cfg.validade.cols - 1}×{cfg.validade.gap} mm
                em {cfg.validade.paperW} mm).
              </p>
              <BorderSelect value={cfg.validade.border} onChange={(v) => setValidade({ border: v })} />
              <details className="text-sm">
                <summary className="cursor-pointer text-fg-muted-token">Calibração fina</summary>
                <div className="space-y-2 mt-2">
                  <NumField label="Deslocar horizontal" value={cfg.validade.offsetX} min={-20} max={20} onChange={(v) => setValidade({ offsetX: v })} />
                  <NumField label="Deslocar vertical" value={cfg.validade.offsetY} min={-10} max={10} onChange={(v) => setValidade({ offsetY: v })} />
                </div>
              </details>
              <p className="text-xs text-fg-muted-token">
                A largura do papel deve bater com a do driver da Elgin (bobina inteira). Manipulação = hoje.
              </p>
            </section>
          )}

        </Card>
        </div>

        {!nutricaoBloqueada && (
        <div className="lg:sticky lg:top-4 space-y-4">
        <Card className="p-4 sm:p-5 space-y-5">
          <>
          <section>
            <h3 className="text-sm font-semibold text-fg-token mb-1.5">Pré-visualização <span className="font-normal text-fg-muted-token">(tamanho real)</span></h3>
            <div
              className="rounded border border-border-token overflow-hidden bg-white"
              style={{ width: preview.w * previewScale + 2, height: preview.h * previewScale + 2 }}
            >
              <iframe
                title="Pré-visualização da etiqueta"
                srcDoc={preview.doc}
                style={{
                  width: preview.w,
                  height: preview.h,
                  border: 0,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </section>

          <FormSummary
            titulo="Vai imprimir"
            linhas={[
              { rotulo: 'Modelo', valor: nomeDoModelo },
              { rotulo: 'Produtos', valor: produtosSelecionados },
              { rotulo: 'Etiquetas', valor: totalLabels },
            ]}
          />

          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              disabled={totalLabels === 0 || preparing}
              onClick={handlePrint}
              data-testid="etq-imprimir"
            >
              <PrinterIcon className="w-5 h-5 mr-1.5" />
              {preparing ? 'Preparando…' : `Imprimir ${totalLabels} etiqueta${totalLabels === 1 ? '' : 's'}`}
            </Button>
            <p className="text-xs text-fg-muted-token">
              Na janela de impressão: impressora de etiquetas, papel igual ao configurado aqui,
              margens "Nenhuma" e escala 100%.
            </p>
          </div>
          {envioRemotoDisponivel && (
            <div className="space-y-2 border-t border-border-token pt-3" data-testid="etq-remoto">
              <h3 className="text-sm font-semibold text-fg-token">Impressora remota (Zebra)</h3>
              {lojaDaSelecao ? (
                <Select
                  rotuloOculto="Programa de impressão com a Zebra"
                  opcoes={agentesDaSelecao.map((a) => ({
                    valor: a.id, rotulo: `${a.name} · ${a.printer_name}${a.is_online ? '' : ' (offline)'}`,
                  }))}
                  valor={agenteEscolhido}
                  onMudar={setAgenteEscolhido}
                />
              ) : (
                <p className="text-xs text-fg-muted-token">Selecione produtos de uma loja só para enviar.</p>
              )}
              <Button
                className="w-full"
                variant="secondary"
                disabled={totalLabels === 0 || enviando || !lojaDaSelecao || !agenteEscolhido}
                onClick={handleEnviarRemoto}
                data-testid="etq-enviar-remoto"
              >
                {enviando ? 'Enviando…' : `Enviar ${totalLabels} etiqueta${totalLabels === 1 ? '' : 's'} para a Zebra`}
              </Button>
              <p className="text-xs text-fg-muted-token">
                Sai direto na Zebra do PC escolhido, de qualquer lugar, sem janela de impressão.
              </p>
            </div>
          )}
          </>
        </Card>
        </div>
        )}

        <Card className="p-4 sm:p-5 space-y-5">

        </Card>
      </div>
    </PageShell>
  );
};

export default EtiquetasPage;
