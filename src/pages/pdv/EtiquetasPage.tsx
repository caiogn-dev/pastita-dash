import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { PrinterIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { Card, Button, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import { getStores, getProducts, updateProduct, StoreProduct } from '../../services/storesApi';
import { generateInternalEan13, isValidEan13 } from '../../utils/ean13';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');

type Template = 'produto' | 'validade';

interface CatalogEntry {
  product: StoreProduct;
  storeSlug: string;
  storeName: string;
}

/** Presets dos aparelhos do usuário; qualquer medida é editável. */
const PRODUTO_PRESETS = [
  { label: '100 × 80 mm', width: 100, height: 80 },
  { label: '100 × 100 mm', width: 100, height: 100 },
];

// Elgin L42 Pro: bobina 3 colunas de 30×22 mm
const VALIDADE = { width: 30, height: 22, cols: 3, gap: 2 };

const BarcodeSvg: React.FC<{ value: string; heightMm?: number }> = ({ value, heightMm = 14 }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: isValidEan13(value) ? 'EAN13' : 'CODE128',
        displayValue: true,
        fontSize: 14,
        margin: 0,
        height: 48,
      });
    } catch {
      /* código não codificável no formato — etiqueta sai sem barras */
    }
  }, [value]);
  return <svg ref={ref} style={{ width: '92%', height: `${heightMm}mm` }} aria-label={`Código de barras ${value}`} />;
};

const EtiquetasPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [qty, setQty] = useState<Map<string, number>>(new Map());
  const [template, setTemplate] = useState<Template>('produto');
  const [labelW, setLabelW] = useState(100);
  const [labelH, setLabelH] = useState(80);
  const [showPrice, setShowPrice] = useState(true);
  const [showDesc, setShowDesc] = useState(false);
  const [shelfDays, setShelfDays] = useState(5);
  const [preparing, setPreparing] = useState(false);

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

  /** Lista final de etiquetas (uma entrada por cópia), na ordem de seleção. */
  const copies = useMemo(() => selected.flatMap(
    (c) => Array.from({ length: qty.get(c.product.id) ?? 0 }, () => c),
  ), [selected, qty]);

  /** Linhas de N colunas pra bobina da Elgin (cada linha = uma "página"). */
  const validadeRows = useMemo(() => {
    const rows: CatalogEntry[][] = [];
    for (let i = 0; i < copies.length; i += VALIDADE.cols) {
      rows.push(copies.slice(i, i + VALIDADE.cols));
    }
    return rows;
  }, [copies]);

  const handlePrint = async () => {
    if (copies.length === 0 || preparing) return;
    setPreparing(true);
    try {
      // Etiqueta de produto sem código → gera EAN-13 interno e grava no produto
      if (template === 'produto') {
        const taken = new Set(catalog.map((c) => c.product.barcode).filter(Boolean));
        const missing = selected.filter((c) => !c.product.barcode);
        for (const c of missing) {
          const code = generateInternalEan13(taken);
          await updateProduct(c.product.id, { barcode: code });
          taken.add(code);
          setCatalog((prev) => prev.map((x) => (
            x.product.id === c.product.id
              ? { ...x, product: { ...x.product, barcode: code } }
              : x
          )));
        }
        if (missing.length > 0) {
          toast.success(`${missing.length} código(s) interno(s) gerado(s) e salvo(s)`);
          // deixa o React re-renderizar a área de impressão com os códigos novos
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      window.print();
    } catch {
      toast.error('Erro ao preparar as etiquetas');
    } finally {
      setPreparing(false);
    }
  };

  const manip = new Date();
  const val = new Date(manip.getTime() + shelfDays * 24 * 60 * 60 * 1000);

  const pageCss = template === 'produto'
    ? `@page { size: ${labelW}mm ${labelH}mm; margin: 0; }`
    : `@page { size: ${VALIDADE.width * VALIDADE.cols + VALIDADE.gap * (VALIDADE.cols - 1)}mm ${VALIDADE.height}mm; margin: 0; }`;

  if (loading) return <Loading />;

  const printArea = (
    <div id="pdv-print-area">
      <style>{`
        #pdv-print-area { display: none; }
        @media print {
          ${pageCss}
          body * { visibility: hidden; }
          #pdv-print-area, #pdv-print-area * { visibility: visible; }
          #pdv-print-area { display: block; position: absolute; left: 0; top: 0; color: #000; background: #fff; }
          .pdv-label-page { page-break-after: always; overflow: hidden; }
        }
      `}</style>
      {template === 'produto' ? copies.map((c, i) => (
        <div
          key={`${c.product.id}-${i}`}
          className="pdv-label-page"
          style={{
            width: `${labelW}mm`, height: `${labelH}mm`, padding: '3mm',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', textAlign: 'center', boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '13pt', fontWeight: 700, lineHeight: 1.15, maxHeight: '40%', overflow: 'hidden' }}>
            {c.product.name}
          </div>
          {showDesc && (c.product.short_description || c.product.description) && (
            <div style={{ fontSize: '8pt', lineHeight: 1.25, maxHeight: '30%', overflow: 'hidden' }}>
              {c.product.short_description || c.product.description}
            </div>
          )}
          {showPrice && (
            <div style={{ fontSize: '20pt', fontWeight: 800 }}>{fmtMoney(Number(c.product.price))}</div>
          )}
          {c.product.barcode && <BarcodeSvg value={c.product.barcode} />}
        </div>
      )) : validadeRows.map((row, ri) => (
        <div
          key={ri}
          className="pdv-label-page"
          style={{ display: 'flex', gap: `${VALIDADE.gap}mm` }}
        >
          {row.map((c, ci) => (
            <div
              key={`${c.product.id}-${ci}`}
              style={{
                width: `${VALIDADE.width}mm`, height: `${VALIDADE.height}mm`, padding: '1.5mm',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxSizing: 'border-box', overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '6.5pt', fontWeight: 700, lineHeight: 1.15, maxHeight: '11mm', overflow: 'hidden' }}>
                {c.product.name}
              </div>
              <div style={{ fontSize: '6pt', lineHeight: 1.3 }}>
                <div>Manip.: {fmtDate(manip)}</div>
                <div style={{ fontWeight: 700 }}>Val.: {fmtDate(val)}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

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

      <div className="grid lg:grid-cols-[1fr,340px] gap-4 md:gap-5 items-start">
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
                    variant={labelW === p.width && labelH === p.height ? 'primary' : 'secondary'}
                    onClick={() => { setLabelW(p.width); setLabelH(p.height); }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  Largura
                  <input
                    type="number" min={20} max={200}
                    className="w-16 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right tabular-nums"
                    value={labelW} onChange={(e) => setLabelW(Number(e.target.value) || labelW)}
                  /> mm
                </label>
                <label className="flex items-center gap-1.5">
                  Altura
                  <input
                    type="number" min={15} max={200}
                    className="w-16 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right tabular-nums"
                    value={labelH} onChange={(e) => setLabelH(Number(e.target.value) || labelH)}
                  /> mm
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                Mostrar preço
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showDesc} onChange={(e) => setShowDesc(e.target.checked)} />
                Mostrar descrição/ingredientes
              </label>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="opacity-70">Bobina 3 colunas de 30×22 mm. Manipulação = hoje.</p>
              <label className="flex items-center gap-1.5">
                Validade em
                <input
                  type="number" min={1} max={365}
                  className="w-16 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right tabular-nums"
                  value={shelfDays}
                  onChange={(e) => setShelfDays(Number(e.target.value) || shelfDays)}
                  data-testid="etq-shelf-days"
                /> dias → {fmtDate(val)}
              </label>
            </div>
          )}

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
            Na janela de impressão, selecione a impressora de etiquetas e confira se o
            tamanho do papel bate com o configurado aqui (sem margens).
          </p>
        </Card>
      </div>

      {createPortal(printArea, document.body)}
    </div>
  );
};

export default EtiquetasPage;
