/**
 * Comanda do painel = a mesma do print agent (22/10).
 *
 * O botão "Imprimir" do pedido montava o papel no navegador (OrderPrint.tsx)
 * e ignorava o "Layout da comanda" salvo — o dono mudou o layout e só a
 * impressora do agente obedeceu. Agora o painel pede as `linhas` ao servidor
 * (POST comanda/previa/ com pedido_id) e só as desenha.
 */
import type { LayoutDaComanda, LinhaDaComanda } from '../services/printing';

const ALINHAR = { esquerda: 'left', centro: 'center', direita: 'right' } as const;

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Cozinha não vê dinheiro: sem preço nos itens, sem totais, sem pagamento. */
export const layoutDaCozinha = (layout: LayoutDaComanda): LayoutDaComanda => ({
  ...layout,
  vias: 1,
  precos_nos_itens: false,
  blocos: layout.blocos.map((b) =>
    b.id === 'totais' || b.id === 'pagamento' ? { ...b, ligado: false } : b),
});

const linhaHtml = (l: LinhaDaComanda): string => {
  if (l.tipo === 'corte') return '<div class="corte"></div>';
  if (l.tipo === 'espaco') return '<div class="l">&nbsp;</div>';
  // O número do pedido já está no papel; barras falsas no navegador não leem.
  if (l.tipo === 'codigo_barras') return '';
  const classes = ['l', l.invertido && 'inv', l.negrito && 'b', l.altura_dupla && 'g', !l.altura_dupla && l.largura_dupla && 'm']
    .filter(Boolean).join(' ');
  return `<div class="${classes}" style="text-align:${ALINHAR[l.alinhar ?? 'esquerda']}">${escapar(l.texto) || '&nbsp;'}</div>`;
};

export const htmlDaComanda = (linhas: LinhaDaComanda[], colunas: number): string => `<!doctype html>
<html><head><meta charset="utf-8"><title>Comanda</title><style>
@page { size: ${colunas <= 32 ? 58 : 80}mm auto; margin: 0; }
body { margin: 0; padding: 2mm; font-family: 'Courier New', Courier, monospace; color: #000; }
.papel { width: ${colunas}ch; font-size: ${colunas <= 32 ? 11 : 10}px; }
.l { white-space: pre; line-height: 1.25; min-height: 1.2em; }
.b { font-weight: 700; }
.g { font-size: 2em; line-height: 1.1; }
.m { font-size: 1.4em; line-height: 1.1; }
.inv { background: #000; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.corte { page-break-after: always; break-after: page; height: 4mm; }
</style></head><body><div class="papel">${linhas.map(linhaHtml).join('')}</div></body></html>`;
