/**
 * Comanda do painel = a mesma do print agent (22/10).
 *
 * O botão "Imprimir" do pedido montava o papel no navegador (OrderPrint.tsx)
 * e ignorava o "Layout da comanda" salvo — o dono mudou o layout e só a
 * impressora do agente obedeceu. Agora o painel pede as `linhas` ao servidor
 * (POST comanda/previa/ com pedido_id) e só as desenha.
 *
 * Tamanho duplo imita a térmica: altura dupla estica só na vertical (a linha
 * continua com `colunas` caracteres) e largura dupla estica na horizontal uma
 * linha que o servidor já quebrou na metade. Com `font-size: 2em` o texto
 * dobrava nos dois eixos e "R$ 80,91" saía para fora da bobina.
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

const linhaHtml = (l: LinhaDaComanda, colunas: number): string => {
  if (l.tipo === 'corte') return '<div class="corte"></div>';
  if (l.tipo === 'espaco') return '<div class="l">&nbsp;</div>';
  // O número do pedido já está no papel; barras falsas no navegador não leem.
  if (l.tipo === 'codigo_barras') return '';
  const sx = l.largura_dupla ? 2 : 1;
  const sy = l.altura_dupla ? 2 : 1;
  const classes = ['l', l.invertido && 'inv', l.negrito && 'b'].filter(Boolean).join(' ');
  const texto = escapar(l.texto) || '&nbsp;';
  const alinhar = ALINHAR[l.alinhar ?? 'esquerda'];
  if (sx === 1 && sy === 1) return `<div class="${classes}" style="text-align:${alinhar}">${texto}</div>`;
  return `<div class="${classes}" style="height:${1.25 * sy}em"><div class="esc" style="width:${colunas / sx}ch;text-align:${alinhar};transform:scale(${sx},${sy})">${texto}</div></div>`;
};

export const htmlDaComanda = (linhas: LinhaDaComanda[], colunas: number): string => {
  // Bobina de 80 mm imprime ~72 mm; 58 mm imprime ~48 mm. Courier: 1ch = 0,6em.
  const util = colunas <= 32 ? 48 : 72;
  const fonte = (util / (colunas * 0.6)).toFixed(2);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Comanda</title><style>
@page { size: ${colunas <= 32 ? 58 : 80}mm auto; margin: 3mm 2mm; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: 'Courier New', Courier, monospace; color: #000; }
.papel { width: ${colunas}ch; font-size: ${fonte}mm; }
.l { white-space: pre; line-height: 1.25; min-height: 1.25em; overflow: hidden; }
.esc { white-space: pre; transform-origin: 0 0; }
.b { font-weight: 700; }
.inv { background: #000; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.corte { page-break-after: always; break-after: page; height: 4mm; }
</style></head><body><div class="papel">${linhas.map((l) => linhaHtml(l, colunas)).join('')}</div></body></html>`;
};
