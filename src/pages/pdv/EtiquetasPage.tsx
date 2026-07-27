import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PrinterIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import { getStores, getProducts, updateProduct, StoreProduct } from '../../services/storesApi';
import { generateInternalEan13 } from '../../utils/ean13';
import {
  buildProdutoDoc, buildValidadeDoc, printHtmlDocument,
  PRODUTO_DEFAULTS, VALIDADE_DEFAULTS, ProdutoConfig, ValidadeConfig,
} from '../../utils/labelPrint';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');
const MM_PX = 96 / 25.4;

type Template = 'produto' | 'validade';

interface CatalogEntry {
  product: StoreProduct;
  storeSlug: string;
  storeName: string;
}

const PRODUTO_PRESETS = [
  { label: '100 × 80 mm', width: 100, height: 80 },
  { label: '100 × 100 mm', width: 100, height: 100 },
];

const CFG_KEY = 'cdx-etiquetas-cfg-v1';

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
}> = ({ label, value, onChange, min = 0, max = 300, step = 0.5, suffix = 'mm', testId }) => (
  <label className="flex items-center justify-between gap-2 text-sm">
    <span className="opacity-80">{label}</span>
    <span className="flex items-center gap-1.5">
      <input
        type="number" min={min} max={max} step={step}
        className="w-20 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right tabular-nums"
        value={value}
        data-testid={testId}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      /> {suffix}
    </span>
  </label>
);

const EtiquetasPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [qty, setQty] = useState<Map<string, number>>(new Map());
  const [template, setTemplate] = useState<Template>('produto');
  const [cfg, setCfg] = useState<SavedConfig>(loadConfig);
  const [preparing, setPreparing] = useState(false);

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
    price: fmtMoney(Number(c.product.price)),
    barcode: barcode ?? c.product.barcode ?? undefined,
  });

  /** Uma entrada por cópia, na ordem da lista. */
  const expandCopies = <T,>(make: (c: CatalogEntry) => T): T[] => selected.flatMap(
    (c) => Array.from({ length: qty.get(c.product.id) ?? 0 }, () => make(c)),
  );

  const handlePrint = async () => {
    if (totalLabels === 0 || preparing) return;
    setPreparing(true);
    try {
      const newCodes = new Map<string, string>();
      // Etiqueta de produto sem código → gera EAN-13 interno e grava no produto
      if (template === 'produto') {
        const taken = new Set(catalog.map((c) => c.product.barcode).filter(Boolean));
        for (const c of selected.filter((x) => !x.product.barcode)) {
          const code = generateInternalEan13(taken);
          await updateProduct(c.product.id, { barcode: code });
          taken.add(code);
          newCodes.set(c.product.id, code);
        }
        if (newCodes.size > 0) {
          setCatalog((prev) => prev.map((x) => (newCodes.has(x.product.id)
            ? { ...x, product: { ...x.product, barcode: newCodes.get(x.product.id) as string } }
            : x)));
          toast.success(`${newCodes.size} código(s) interno(s) gerado(s) e salvo(s)`);
        }
      }
      const doc = template === 'produto'
        ? buildProdutoDoc(expandCopies((c) => produtoLabel(c, newCodes.get(c.product.id))), cfg.produto)
        : buildValidadeDoc(
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

  /** Primeira página, renderizada com o mesmo gerador da impressão. */
  const preview = useMemo(() => {
    if (template === 'produto') {
      const sample = selected[0]
        ? produtoLabel(selected[0])
        : { name: 'Produto de exemplo', description: 'Descrição', price: fmtMoney(19.9), barcode: '2000000000008' };
      const p = cfg.produto;
      return {
        doc: buildProdutoDoc([sample], p),
        w: (p.rotate ? p.height : p.width) * MM_PX,
        h: (p.rotate ? p.width : p.height) * MM_PX,
      };
    }
    const v = cfg.validade;
    const dates = { manip: fmtDate(manip), val: fmtDate(val) };
    const row = selected.length > 0
      ? selected.slice(0, v.cols).map((c) => ({ name: c.product.name, ...dates }))
      : Array.from({ length: v.cols }, (_, i) => ({ name: `Produto ${i + 1}`, ...dates }));
    return { doc: buildValidadeDoc(row, v), w: v.paperW * MM_PX, h: v.labelH * MM_PX };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, cfg, selected, cfg.shelfDays]);
  const previewScale = Math.min(300 / preview.w, 1);

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TagIcon className="w-6 h-6" /> Etiquetas
        </h1>
        <p className="text-sm opacity-70">
          Imprima etiquetas de produto (com código de barras) ou de validade direto do cadastro —
          produto sem código ganha um EAN-13 interno na hora.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-4 md:gap-5 items-start">
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-48">
              <SearchInput
                placeholder="Buscar produto…"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            {stores.length > 1 && (
              <select
                className="rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                aria-label="Filtrar por loja"
              >
                <option value="all">Todas as lojas</option>
                {stores.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            )}
          </div>
          <ul className="divide-y divide-black/10 dark:divide-white/10 max-h-[26rem] overflow-y-auto" data-testid="etq-produtos">
            {visible.map((c) => (
              <li key={c.product.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.product.name}</div>
                  <div className="text-xs opacity-60">
                    {stores.length > 1 && `${c.storeName} · `}
                    {fmtMoney(Number(c.product.price))}
                    {c.product.barcode ? ` · ${c.product.barcode}` : ' · sem código (gera na impressão)'}
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={999}
                  className="w-20 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm text-right tabular-nums"
                  value={qty.get(c.product.id) ?? 0}
                  onChange={(e) => setProductQty(c.product.id, Number(e.target.value) || 0)}
                  aria-label={`Quantidade de etiquetas de ${c.product.name}`}
                />
              </li>
            ))}
            {visible.length === 0 && (
              <li className="py-6 text-center text-sm opacity-60">Nenhum produto encontrado</li>
            )}
          </ul>
        </Card>

        <Card className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Modelo</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={template === 'produto' ? 'primary' : 'secondary'}
                onClick={() => setTemplate('produto')}
              >
                Produto (Zebra)
              </Button>
              <Button
                variant={template === 'validade' ? 'primary' : 'secondary'}
                onClick={() => setTemplate('validade')}
              >
                Validade (Elgin)
              </Button>
            </div>
          </div>

          {template === 'produto' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRODUTO_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant={cfg.produto.width === p.width && cfg.produto.height === p.height ? 'primary' : 'secondary'}
                    onClick={() => setProduto({ width: p.width, height: p.height })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <NumField label="Largura" value={cfg.produto.width} min={20} max={200} onChange={(v) => setProduto({ width: v })} />
              <NumField label="Altura" value={cfg.produto.height} min={15} max={200} onChange={(v) => setProduto({ height: v })} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.produto.rotate}
                  onChange={(e) => setProduto({ rotate: e.target.checked })}
                  data-testid="etq-rotate"
                />
                Girar 90° (se sair torta/rotacionada no driver)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.produto.showPrice} onChange={(e) => setProduto({ showPrice: e.target.checked })} />
                Mostrar preço
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.produto.showDesc} onChange={(e) => setProduto({ showDesc: e.target.checked })} />
                Mostrar descrição/ingredientes
              </label>
              <details className="text-sm">
                <summary className="cursor-pointer opacity-70">Calibração (ajuste fino)</summary>
                <div className="space-y-2 mt-2">
                  <NumField label="Deslocar horizontal" value={cfg.produto.offsetX} min={-20} max={20} onChange={(v) => setProduto({ offsetX: v })} />
                  <NumField label="Deslocar vertical" value={cfg.produto.offsetY} min={-20} max={20} onChange={(v) => setProduto({ offsetY: v })} />
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
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
              <details className="text-sm">
                <summary className="cursor-pointer opacity-70">Calibração (ajuste fino)</summary>
                <div className="space-y-2 mt-2">
                  <NumField label="Deslocar horizontal" value={cfg.validade.offsetX} min={-20} max={20} onChange={(v) => setValidade({ offsetX: v })} />
                  <NumField label="Deslocar vertical" value={cfg.validade.offsetY} min={-10} max={10} onChange={(v) => setValidade({ offsetY: v })} />
                </div>
              </details>
              <p className="opacity-60 text-xs">
                A largura do papel deve bater com a definida no driver da Elgin
                (bobina inteira). Manipulação = hoje.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1.5">Pré-visualização (tamanho real do papel)</p>
            <div
              className="rounded border border-black/15 dark:border-white/15 overflow-hidden bg-white"
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
          </div>

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
          <p className="text-xs opacity-60">
            Na janela de impressão: selecione a impressora de etiquetas, papel igual ao
            configurado aqui, margens “Nenhuma” e escala 100% (sem “ajustar à página”).
          </p>
        </Card>
      </div>
    </div>
  );
};

export default EtiquetasPage;
