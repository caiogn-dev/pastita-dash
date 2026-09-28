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
    texto: { texto: 'Texto', tamanho: 2.5, negrito: false, linhas: 1, alinhar: 'esquerda' },
    qr: { campo: 'publicUrl', w: Math.min(14, l.etiqueta.largura - 2), h: Math.min(14, l.etiqueta.altura - 2) },
    barras: { campo: 'barcode', h: Math.min(15, l.etiqueta.altura - 2) },
    linha: { h: 0.3 },
    caixa: { espessura: 0.3, w: l.etiqueta.largura, h: l.etiqueta.altura, x: 0, y: 0 },
  };
  return { ...l, elementos: [...l.elementos, { ...base, ...porTipo[tipo] }] };
};

export const textoDeExemplo = (molde: string, exemplo: Record<string, string>): string =>
  molde.replace(/\{(\w+)\}/g, (_, k: string) => exemplo[k] ?? '');

export const problemaDoLayout = (l: LayoutDeEtiqueta): string | null => {
  if (!(l.etiqueta.largura >= 5) || !(l.etiqueta.altura >= 5)) return 'A etiqueta precisa de largura e altura de pelo menos 5 mm.';
  if (!(l.papel.colunas >= 1)) return 'Pelo menos 1 coluna.';
  const bloco = blocoMm(l);
  if (l.papel.largura + 0.01 < bloco) return `O papel tem ${l.papel.largura} mm e as colunas ocupam ${bloco} mm: não cabe.`;
  return null;
};

export const ajustarPapelAoBloco = (l: LayoutDeEtiqueta): LayoutDeEtiqueta =>
  ({ ...l, papel: { ...l.papel, largura: blocoMm(l) } });

/** Margem esquerda até a 1ª coluna (centralizada, salvo margem fixa). */
export const margemEsquerda = (l: LayoutDeEtiqueta): number =>
  l.papel.margem != null ? l.papel.margem : Math.max(0, (l.papel.largura - blocoMm(l)) / 2);
