/**
 * Geometria pura do editor de etiqueta (sem React): mover, redimensionar,
 * validar. Tudo em mm; o canvas converte com `escalaDoCanvas`.
 */
import type { ElementoDoLayout, LayoutDeEtiqueta, TipoDeElemento } from '../../services/printing';

export const ESCALA_MAXIMA = 6; // px por mm no canvas
const PASSO = 0.1;
const MINIMO = 0.5;

/** Dados de mentira para a prévia: nome comprido de propósito, para ver a quebra. */
export const ETIQUETA_DE_EXEMPLO = {
  name: 'Salada Caesar com frango grelhado',
  manip: '28/09/2026',
  val: '03/10/2026',
  price: 'R$ 24,90',
  description: 'Alface, frango, parmesão e croutons',
  barcode: '7891234567895',
  publicUrl: 'https://backend.pastita.com.br/api/v1/nutrition/public/exemplo/',
  ingredients: 'Alface, frango grelhado, parmesão, croutons, molho caesar',
  allergens: 'ALÉRGICOS: CONTÉM LEITE, TRIGO E OVOS.',
  servingG: 350, householdMeasure: '1 pote', servingsPerContainer: 1,
  per100g: { energy_kcal: 128, carbohydrates_g: 28.1, total_sugars_g: null, added_sugars_g: 0, protein_g: 8.5, total_fat_g: 4.2, saturated_fat_g: 1.1, trans_fat_g: 0, fiber_g: 3.2, sodium_mg: 210 },
};

const arredondar = (v: number) => Math.round(v / PASSO) * PASSO;
const fixo = (v: number) => Number(v.toFixed(1));

export const blocoMm = (l: LayoutDeEtiqueta): number =>
  fixo(l.papel.colunas * l.etiqueta.largura + Math.max(0, l.papel.colunas - 1) * l.papel.espaco);

export const escalaDoCanvas = (papelLarguraMm: number, larguraDisponivelPx: number): number =>
  Math.min(ESCALA_MAXIMA, larguraDisponivelPx / Math.max(1, papelLarguraMm));

const trocar = (l: LayoutDeEtiqueta, id: string, f: (e: ElementoDoLayout) => ElementoDoLayout): LayoutDeEtiqueta => {
  if (!l.elementos.some((e) => e.id === id)) return l;
  return { ...l, elementos: l.elementos.map((e) => (e.id === id ? f(e) : e)) };
};

export const moverElemento = (l: LayoutDeEtiqueta, id: string, dxMm: number, dyMm: number): LayoutDeEtiqueta =>
  trocar(l, id, (e) => ({
    ...e,
    x: fixo(Math.min(Math.max(0, arredondar(e.x + dxMm)), Math.max(0, l.etiqueta.largura - e.w))),
    y: fixo(Math.min(Math.max(0, arredondar(e.y + dyMm)), Math.max(0, l.etiqueta.altura - e.h))),
  }));

export const redimensionarElemento = (l: LayoutDeEtiqueta, id: string, wMm: number, hMm: number): LayoutDeEtiqueta =>
  trocar(l, id, (e) => ({
    ...e,
    w: fixo(Math.min(Math.max(MINIMO, arredondar(wMm)), Math.max(MINIMO, l.etiqueta.largura - e.x))),
    h: fixo(Math.min(Math.max(MINIMO, arredondar(hMm)), Math.max(MINIMO, l.etiqueta.altura - e.y))),
  }));

export const editarElemento = (l: LayoutDeEtiqueta, id: string, patch: Partial<ElementoDoLayout>): LayoutDeEtiqueta =>
  trocar(l, id, (e) => ({ ...e, ...patch }));

export const removerElemento = (l: LayoutDeEtiqueta, id: string): LayoutDeEtiqueta =>
  ({ ...l, elementos: l.elementos.filter((e) => e.id !== id) });

let contador = 0;
export const novoElemento = (l: LayoutDeEtiqueta, tipo: TipoDeElemento): LayoutDeEtiqueta => {
  contador += 1;
  const id = `${tipo}-${Date.now().toString(36)}-${contador}`;
  const w = Math.min(20, l.etiqueta.largura - 2);
  const base: ElementoDoLayout = { id, tipo, x: 1, y: 1, w, h: 4 };
  const porTipo: Record<TipoDeElemento, Partial<ElementoDoLayout>> = {
    texto: { texto: 'Texto', tamanho: 2.5, negrito: false, linhas: 0, alinhar: 'esquerda', h: 6 },
    qr: { campo: 'publicUrl', w: Math.min(14, l.etiqueta.largura - 2), h: Math.min(14, l.etiqueta.altura - 2) },
    barras: { campo: 'barcode', h: Math.min(15, l.etiqueta.altura - 2) },
    linha: { h: 0.3 },
    caixa: { espessura: 0.3, w: l.etiqueta.largura, h: l.etiqueta.altura, x: 0, y: 0 },
    tabela: { w: Math.min(60, l.etiqueta.largura - 2), h: Math.min(62, l.etiqueta.altura - 2) },
  };
  return { ...l, elementos: [...l.elementos, { ...base, ...porTipo[tipo] }] };
};

export const textoDeExemplo = (molde: string, exemplo: Record<string, unknown>): string =>
  molde.replace(/\{(\w+)\}/g, (_, k: string) => (typeof exemplo[k] === 'string' ? (exemplo[k] as string) : ''));

export const problemaDoLayout = (l: LayoutDeEtiqueta): string | null => {
  if (!(l.etiqueta.largura >= 5) || !(l.etiqueta.altura >= 5)) return 'A etiqueta precisa de largura e altura de pelo menos 5 mm.';
  if (temMargensMedidas(l) && Math.abs(l.papel.largura - roloPelasMargens(l)) > 0.05) return `Rolo de ${l.papel.largura} mm não fecha: ${roloPelasMargens(l)} mm pelas margens.`;
  if (!(l.papel.colunas >= 1)) return 'Pelo menos 1 coluna.';
  const bloco = blocoMm(l);
  if (l.papel.largura + 0.01 < bloco) return `O papel tem ${l.papel.largura} mm e as colunas ocupam ${bloco} mm: não cabe.`;
  return null;
};

export const ajustarPapelAoBloco = (l: LayoutDeEtiqueta): LayoutDeEtiqueta =>
  ({ ...l, papel: { ...l.papel, largura: blocoMm(l) } });

/** Margem esquerda até a 1ª coluna (centralizada, salvo margem fixa). */
export const margemEsquerda = (l: LayoutDeEtiqueta): number => {
  if (l.papel.margem_esquerda != null) return l.papel.margem_esquerda;
  if (l.papel.margem != null) return l.papel.margem;
  return Math.max(0, (l.papel.largura - blocoMm(l)) / 2);
};

/** Com as duas margens medidas, o rolo é a soma; a pessoa não digita a largura. */
export const temMargensMedidas = (l: LayoutDeEtiqueta): boolean =>
  l.papel.margem_esquerda != null && l.papel.margem_direita != null;

export const roloPelasMargens = (l: LayoutDeEtiqueta): number =>
  fixo((l.papel.margem_esquerda ?? 0) + blocoMm(l) + (l.papel.margem_direita ?? 0));

/** Muda margens/colunas mantendo o rolo coerente quando as margens são medidas. */
export const comPapel = (l: LayoutDeEtiqueta, p: Partial<LayoutDeEtiqueta['papel']>): LayoutDeEtiqueta => {
  const novo = { ...l, papel: { ...l.papel, ...p } };
  return temMargensMedidas(novo) ? { ...novo, papel: { ...novo.papel, largura: roloPelasMargens(novo) } } : novo;
};

// ---------------------------------------------------------------------------
// Designer: alças de redimensionar, guias de encaixe, camadas e histórico.
// ---------------------------------------------------------------------------

export const encaixar = (v: number, passo = 0.5): number => Number((Math.round(v / passo) * passo).toFixed(2));

/** Alças no sentido da bússola: n, s, l (leste), o (oeste), nl, no, sl, so → aqui 'sd' = sul-direita etc. */
export type Alca = 'n' | 's' | 'l' | 'o' | 'ne' | 'no' | 'sd' | 'so';

export const redimensionarPorAlca = (l: LayoutDeEtiqueta, id: string, alca: Alca, dxMm: number, dyMm: number): LayoutDeEtiqueta =>
  trocar(l, id, (e) => {
    let { x, y, w, h } = e;
    const direita = x + w; const baixo = y + h;
    if (alca.includes('o')) { x = Math.min(Math.max(0, x + dxMm), direita - MINIMO); w = direita - x; }
    if (alca === 'l' || alca === 'ne' || alca === 'sd') { w = Math.max(MINIMO, Math.min(w + dxMm, l.etiqueta.largura - x)); }
    if (alca.includes('n')) { y = Math.min(Math.max(0, y + dyMm), baixo - MINIMO); h = baixo - y; }
    if (alca.includes('s')) { h = Math.max(MINIMO, Math.min(h + dyMm, l.etiqueta.altura - y)); }
    return { ...e, x: fixo(x), y: fixo(y), w: fixo(w), h: fixo(h) };
  });

export interface Guias { x: number[]; y: number[] }

/** Onde vale encaixar: bordas e centro da etiqueta, bordas e centro dos outros elementos. */
export const guiasDoLayout = (l: LayoutDeEtiqueta, ignorarId?: string): Guias => {
  const x = new Set<number>([0, fixo(l.etiqueta.largura / 2), l.etiqueta.largura]);
  const y = new Set<number>([0, fixo(l.etiqueta.altura / 2), l.etiqueta.altura]);
  l.elementos.filter((e) => e.id !== ignorarId).forEach((e) => {
    x.add(fixo(e.x)); x.add(fixo(e.x + e.w)); x.add(fixo(e.x + e.w / 2));
    y.add(fixo(e.y)); y.add(fixo(e.y + e.h)); y.add(fixo(e.y + e.h / 2));
  });
  return { x: [...x], y: [...y] };
};

interface Caixa { x: number; y: number; w: number; h: number }

const puxar = (bordas: number[], guias: number[], tol: number): { delta: number; guia: number } | null => {
  let melhor: { delta: number; guia: number } | null = null;
  for (const b of bordas) for (const g of guias) {
    const d = g - b;
    if (Math.abs(d) <= tol && (!melhor || Math.abs(d) < Math.abs(melhor.delta))) melhor = { delta: d, guia: g };
  }
  return melhor;
};

/** Se a borda esquerda/direita/centro (ou topo/base/centro) passa a `tol` mm de uma guia, cola nela. */
export const encaixarNasGuias = (c: Caixa, g: Guias, tol: number): { x: number; y: number; guiaX: number | null; guiaY: number | null } => {
  const px = puxar([c.x, c.x + c.w, c.x + c.w / 2], g.x, tol);
  const py = puxar([c.y, c.y + c.h, c.y + c.h / 2], g.y, tol);
  return {
    x: fixo(c.x + (px?.delta ?? 0)), y: fixo(c.y + (py?.delta ?? 0)),
    guiaX: px ? px.guia : null, guiaY: py ? py.guia : null,
  };
};

export const duplicarElemento = (l: LayoutDeEtiqueta, id: string): LayoutDeEtiqueta => {
  const e = l.elementos.find((x) => x.id === id);
  if (!e) return l;
  contador += 1;
  const copia: ElementoDoLayout = {
    ...e, id: `${e.tipo}-${Date.now().toString(36)}-${contador}`,
    x: fixo(Math.min(e.x + 1, Math.max(0, l.etiqueta.largura - e.w))),
    y: fixo(Math.min(e.y + 1, Math.max(0, l.etiqueta.altura - e.h))),
  };
  return { ...l, elementos: [...l.elementos, copia] };
};

export const moverCamada = (l: LayoutDeEtiqueta, id: string, direcao: 'cima' | 'baixo'): LayoutDeEtiqueta => {
  const i = l.elementos.findIndex((e) => e.id === id);
  const j = direcao === 'cima' ? i + 1 : i - 1;   // maior índice = desenhado por último = por cima
  if (i < 0 || j < 0 || j >= l.elementos.length) return l;
  const els = [...l.elementos]; [els[i], els[j]] = [els[j], els[i]];
  return { ...l, elementos: els };
};

export const nomeDoElemento = (e: ElementoDoLayout): string => {
  if (e.tipo === 'texto') return (e.texto || '').trim() || 'Texto';
  return { qr: 'QR Code', barras: 'Código de barras', linha: 'Linha', caixa: 'Caixa', texto: 'Texto', tabela: 'Tabela nutricional' }[e.tipo];
};

/** Desfazer/refazer: pilha simples, com o presente no topo de `passado`. */
export class Historico {
  private passado: LayoutDeEtiqueta[];
  private futuro: LayoutDeEtiqueta[] = [];
  constructor(inicial: LayoutDeEtiqueta, private limite = 100) { this.passado = [inicial]; }
  get atual(): LayoutDeEtiqueta { return this.passado[this.passado.length - 1]; }
  get podeDesfazer(): boolean { return this.passado.length > 1; }
  get podeRefazer(): boolean { return this.futuro.length > 0; }
  gravar(l: LayoutDeEtiqueta): void {
    if (l === this.atual) return;
    this.passado.push(l); this.futuro = [];
    if (this.passado.length > this.limite) this.passado.shift();
  }
  desfazer(): LayoutDeEtiqueta | null {
    if (!this.podeDesfazer) return null;
    this.futuro.push(this.passado.pop() as LayoutDeEtiqueta);
    return this.atual;
  }
  refazer(): LayoutDeEtiqueta | null {
    const l = this.futuro.pop();
    if (!l) return null;
    this.passado.push(l);
    return l;
  }
}

/** Modelos que saem do mesmo rolo que `modelo` (para avisar que o papel é compartilhado). */
export const NOME_CURTO_DO_MODELO: Record<string, string> = { validade: 'Validade', 'nutricao-qr': 'QR Nutrição', produto: 'Produto', nutricao: 'Tabela nutricional' };
export const irmaosDoRolo = (layouts: Record<string, unknown> | null, modelo: string): string[] => {
  if (!layouts) return [];
  const atual = layouts[modelo] as { layout?: LayoutDeEtiqueta } | undefined;
  const rolo = atual?.layout?.papel.rolo;
  if (!rolo) return [];
  return Object.entries(layouts)
    .filter(([k, v]) => k !== modelo && !!v && typeof v === 'object' && 'layout' in (v as object) && (v as { layout?: LayoutDeEtiqueta }).layout?.papel?.rolo === rolo)
    .map(([k]) => NOME_CURTO_DO_MODELO[k] ?? k);
};
