/**
 * Geração e impressão de etiquetas em documento HTML isolado.
 *
 * Em vez de imprimir o SPA inteiro com truques de `visibility`, montamos um
 * documento standalone com geometria exata em mm e imprimimos via iframe
 * dedicado — nenhum CSS do painel vaza pra etiqueta e o layout enviado ao
 * driver é exatamente o pré-visualizado.
 *
 * Modelo de geometria (igual pro rolo da Zebra e da Elgin):
 *   largura do papel (bobina/liner, o que o driver conhece)
 *   → margens laterais automáticas = (papel − bloco de etiquetas) / 2
 *   → etiquetas e divisórias (gap) posicionadas em mm absoluto.
 * Os offsets X/Y são só calibração fina por cima disso.
 */
import JsBarcode from 'jsbarcode';
import { isValidEan13 } from './ean13';

export type LabelBorder = 'none' | 'solid' | 'dashed';

export interface ProdutoLabelData {
  name: string;
  description?: string;
  price?: string;
  barcode?: string;
}

export interface ValidadeLabelData {
  name: string;
  manip: string;
  val: string;
}

export interface BarcodeCatalogProduct {
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
}

export interface BarcodeCatalogStore {
  name: string;
  products: BarcodeCatalogProduct[];
}

export interface NutritionLabelData {
  name: string;
  servingG: number;
  householdMeasure?: string;
  ingredients?: string;
  allergens?: string;
  per100g: Record<string, number | null | undefined>;
}

export interface ProdutoConfig {
  /** Dimensões da etiqueta em mm (como o operador enxerga a etiqueta). */
  width: number;
  height: number;
  /** Largura do papel/bobina definida no driver; etiqueta é centralizada nela. */
  paperW: number;
  /** Gira o conteúdo 90° quando o driver define a bobina em retrato. */
  rotate: boolean;
  /** Calibração fina em mm pra compensar offset mecânico da impressora. */
  offsetX: number;
  offsetY: number;
  border: LabelBorder;
  showPrice: boolean;
  showDesc: boolean;
}

export interface ValidadeConfig {
  labelW: number;
  labelH: number;
  cols: number;
  gap: number;
  /** Largura do papel como definida no driver (bobina inteira, com margens). */
  paperW: number;
  offsetX: number;
  offsetY: number;
  border: LabelBorder;
}

export const PRODUTO_DEFAULTS: ProdutoConfig = {
  width: 100, height: 80, paperW: 100, rotate: false,
  offsetX: 0, offsetY: 0, border: 'none',
  showPrice: true, showDesc: false,
};

// Bobina 3 colunas padrão de mercado: etiquetas 33×22, gap 3, rolo ~107 mm
export const VALIDADE_DEFAULTS: ValidadeConfig = {
  labelW: 33, labelH: 22, cols: 3, gap: 3, paperW: 107,
  offsetX: 0, offsetY: 0, border: 'none',
};

/** Margem lateral automática que centraliza o bloco de colunas no papel. */
export const validadeMargin = (cfg: ValidadeConfig): number => {
  const block = cfg.cols * cfg.labelW + (cfg.cols - 1) * cfg.gap;
  return Math.max(0, (cfg.paperW - block) / 2);
};

const round = (v: number) => Math.round(v * 100) / 100;

const borderCss = (b: LabelBorder, radius: number): string =>
  (b === 'none' ? '' : `border: 0.4mm ${b} #000; border-radius: ${radius}mm;`);

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
));

/** SVG do código de barras serializado, escalável (viewBox) pra caber na etiqueta. */
const barcodeSvg = (value: string): string => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, value, {
      format: isValidEan13(value) ? 'EAN13' : 'CODE128',
      displayValue: true,
      fontSize: 16,
      margin: 0,
      height: 56,
    });
  } catch {
    return '';
  }
  const w = svg.getAttribute('width');
  const h = svg.getAttribute('height');
  if (w && h && !svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('style', 'width:100%;height:100%;');
  return new XMLSerializer().serializeToString(svg);
};

const wrapDoc = (title: string, css: string, body: string): string => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page { overflow: hidden; position: relative; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
${css}
</style></head><body>${body}</body></html>`;

/** Documento pra etiqueta de produto (Zebra ZD220 e afins), uma etiqueta por página. */
export const buildProdutoDoc = (labels: ProdutoLabelData[], cfg: ProdutoConfig): string => {
  const paperW = Math.max(cfg.paperW, cfg.width);
  // centraliza a etiqueta na largura da bobina; sobra vira margem dos 2 lados
  const centerShift = round((paperW - cfg.width) / 2);
  const pageW = cfg.rotate ? cfg.height : paperW;
  const pageH = cfg.rotate ? paperW : cfg.height;
  // rotacionado, o eixo da largura da bobina passa a ser o Y da página
  const transform = cfg.rotate
    ? `translate(${cfg.offsetX}mm, ${round(centerShift + cfg.offsetY)}mm) rotate(90deg) translateY(-100%)`
    : `translate(${round(centerShift + cfg.offsetX)}mm, ${cfg.offsetY}mm)`;
  const css = `
@page { size: ${pageW}mm ${pageH}mm; margin: 0; }
.page { width: ${pageW}mm; height: ${pageH}mm; }
.label {
  position: absolute; left: 0; top: 0;
  width: ${cfg.width}mm; height: ${cfg.height}mm; padding: 2.5mm;
  transform: ${transform}; transform-origin: top left;
  ${borderCss(cfg.border, 1.5)}
  display: flex; flex-direction: column; align-items: center;
  justify-content: space-between; text-align: center; overflow: hidden;
}
.nm { font-size: 13pt; font-weight: 800; line-height: 1.15; max-height: 38%; overflow: hidden; }
.ds { font-size: 8pt; line-height: 1.25; max-height: 28%; overflow: hidden; }
.pr { font-size: 20pt; font-weight: 800; }
.bc { width: 94%; height: ${Math.max(10, cfg.height * 0.22)}mm; }`;
  const body = labels.map((l) => `<div class="page"><div class="label">
<div class="nm">${esc(l.name)}</div>
${cfg.showDesc && l.description ? `<div class="ds">${esc(l.description)}</div>` : ''}
${cfg.showPrice && l.price ? `<div class="pr">${esc(l.price)}</div>` : ''}
${l.barcode ? `<div class="bc">${barcodeSvg(l.barcode)}</div>` : ''}
</div></div>`).join('\n');
  return wrapDoc('Etiquetas de produto', css, body);
};

/** Documento pra bobina multi-coluna de validade (Elgin L42), uma linha por página. */
export const buildValidadeDoc = (labels: ValidadeLabelData[], cfg: ValidadeConfig): string => {
  const rows: ValidadeLabelData[][] = [];
  for (let i = 0; i < labels.length; i += cfg.cols) rows.push(labels.slice(i, i + cfg.cols));
  const margin = validadeMargin(cfg);
  const css = `
@page { size: ${cfg.paperW}mm ${cfg.labelH}mm; margin: 0; }
.page { width: ${cfg.paperW}mm; height: ${cfg.labelH}mm; }
.cell {
  position: absolute; top: ${cfg.offsetY}mm;
  width: ${cfg.labelW}mm; height: ${cfg.labelH}mm; padding: 1.4mm 1.6mm;
  ${borderCss(cfg.border, 1)}
  display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
}
.nm {
  font-size: 7pt; font-weight: 700; line-height: 1.15;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.dt { font-size: 6.5pt; line-height: 1.3; }
.dt b { font-size: 7pt; }`;
  const body = rows.map((row) => `<div class="page">${row.map((l, i) => `
<div class="cell" style="left:${round(margin + cfg.offsetX + i * (cfg.labelW + cfg.gap))}mm">
<div class="nm">${esc(l.name)}</div>
<div class="dt">Manip.: ${esc(l.manip)}<br><b>Val.: ${esc(l.val)}</b></div>
</div>`).join('')}</div>`).join('\n');
  return wrapDoc('Etiquetas de validade', css, body);
};

/** Folha A4 de consulta, agrupada por loja, para imprimir ou salvar como PDF. */
export const buildBarcodeCatalogDoc = (stores: BarcodeCatalogStore[]): string => {
  const css = `
@page { size: A4 portrait; margin: 12mm; }
body { font-size: 9pt; }
.sheet-title { margin: 0 0 7mm; font-size: 18pt; line-height: 1.1; }
.store { break-before: page; }
.store:first-of-type { break-before: auto; }
.store-title {
  margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 0.5mm solid #000;
  font-size: 14pt; line-height: 1.1;
}
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4mm; }
.item {
  min-height: 31mm; padding: 3mm; border: 0.25mm solid #aaa;
  break-inside: avoid; display: flex; flex-direction: column;
}
.name { font-size: 10pt; font-weight: 700; line-height: 1.2; }
.meta { margin-top: 1mm; color: #444; font-size: 7.5pt; line-height: 1.25; }
.barcode { height: 16mm; margin-top: auto; padding-top: 2mm; }
.barcode svg { width: 100%; height: 100%; }
.digits { margin-top: 0.5mm; font-size: 8pt; text-align: center; letter-spacing: .08em; }
.missing {
  margin-top: auto; padding-top: 4mm; color: #666; font-size: 9pt;
  font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
}`;
  const body = `<h1 class="sheet-title">Catálogo de códigos de barras</h1>${stores.map((store) => `
<section class="store">
  <h2 class="store-title">${esc(store.name)}</h2>
  <div class="grid">${store.products.map((product) => `
    <article class="item">
      <div class="name">${esc(product.name)}</div>
      <div class="meta">${[
        product.category ? esc(product.category) : '',
        product.sku ? `SKU: ${esc(product.sku)}` : '',
      ].filter(Boolean).join(' · ')}</div>
      ${product.barcode
        ? `<div class="barcode">${barcodeSvg(product.barcode)}</div><div class="digits">${esc(product.barcode)}</div>`
        : '<div class="missing">Sem código</div>'}
    </article>`).join('')}
  </div>
</section>`).join('')}`;
  return wrapDoc('Catálogo de códigos de barras', css, body);
};

const NUTRITION_ROWS = [
  ['energy_kcal','Valor energético','kcal',2000], ['carbohydrates_g','Carboidratos','g',300],
  ['total_sugars_g','Açúcares totais','g',null], ['added_sugars_g','Açúcares adicionados','g',50],
  ['protein_g','Proteínas','g',50], ['total_fat_g','Gorduras totais','g',65],
  ['saturated_fat_g','Gorduras saturadas','g',20], ['trans_fat_g','Gorduras trans','g',2],
  ['fiber_g','Fibra alimentar','g',25], ['sodium_mg','Sódio','mg',2000],
] as const;

/** Etiqueta nutricional completa para a Zebra 100×80 mm. */
export const buildNutritionDoc = (labels: NutritionLabelData[]): string => {
  const css = `
@page { size: 100mm 80mm; margin: 0; }
.label { width:100mm; height:80mm; padding:3mm 4mm; overflow:hidden; break-after:page; }
.product { font-size:11pt; font-weight:800; line-height:1.05; margin-bottom:1.2mm; }
.title { border-top:1.2mm solid #000; border-bottom:.45mm solid #000; font-size:12pt; font-weight:900; padding:.7mm 0; }
.serving { font-size:6.7pt; padding:.7mm 0; border-bottom:.3mm solid #000; }
table { width:100%; border-collapse:collapse; font-size:6.2pt; line-height:1.05; }
th,td { border-bottom:.18mm solid #000; padding:.45mm .5mm; text-align:right; }
th:first-child,td:first-child { text-align:left; font-weight:700; }
thead th { font-size:5.8pt; vertical-align:bottom; }
.foot { font-size:5.3pt; line-height:1.1; margin-top:.7mm; }
.ingredients { font-size:5.5pt; line-height:1.12; margin-top:.8mm; }
.allergens { font-weight:900; text-transform:uppercase; }`;
  const fmt=(v:number|null|undefined,unit:string)=>v==null?'—':`${v.toLocaleString('pt-BR',{maximumFractionDigits:unit==='mg'?0:1})}`;
  const body=labels.map(l=>{const servingFactor=l.servingG/100;return `<section class="label"><div class="product">${esc(l.name)}</div><div class="title">INFORMAÇÃO NUTRICIONAL</div><div class="serving">Porções por embalagem: — &nbsp;|&nbsp; Porção: ${l.servingG} g${l.householdMeasure?` (${esc(l.householdMeasure)})`:''}</div><table><thead><tr><th></th><th>100 g</th><th>${l.servingG} g</th><th>%VD*</th></tr></thead><tbody>${NUTRITION_ROWS.map(([key,name,unit,vd])=>{const base=l.per100g[key];const serving=base==null?null:base*servingFactor;const pct=vd&&serving!=null?Math.round(serving/vd*100):null;return `<tr><td>${name} (${unit})</td><td>${fmt(base,unit)}</td><td>${fmt(serving,unit)}</td><td>${pct==null?'—':pct}</td></tr>`}).join('')}</tbody></table><div class="foot">*Percentual de valores diários fornecidos pela porção.</div>${l.ingredients?`<div class="ingredients"><b>INGREDIENTES:</b> ${esc(l.ingredients)}</div>`:''}${l.allergens?`<div class="ingredients allergens">${esc(l.allergens)}</div>`:''}</section>`}).join('');
  return wrapDoc('Etiquetas nutricionais 100×80',css,body);
};

/** Imprime um documento HTML completo num iframe isolado e descartável. */
export const printHtmlDocument = (html: string): Promise<void> => new Promise((resolve) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  const cleanup = () => { iframe.remove(); resolve(); };
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (win && typeof win.print === 'function') {
      win.focus();
      win.print();
    }
    // dá tempo do diálogo capturar o documento antes de remover o iframe
    setTimeout(cleanup, 2000);
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
});
