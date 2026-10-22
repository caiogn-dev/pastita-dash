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

// "TOTAL            R$ 80,91": rótulo e valor que o servidor alinhou com espaços.
const DUAS_COLUNAS = /^(.*\S)\s{2,}(\S.*)$/;

const linhaHtml = (l: LinhaDaComanda): string => {
  if (l.tipo === 'corte') return '<div class="corte"></div>';
  if (l.tipo === 'espaco') return '<div class="l">&nbsp;</div>';
  // O número do pedido já está no papel; barras falsas no navegador não leem.
  if (l.tipo === 'codigo_barras') return '';
  const grande = l.altura_dupla || l.largura_dupla;
  const classes = ['l', l.invertido && 'inv', l.negrito && 'b', grande && 'g'].filter(Boolean).join(' ');
  const alinhar = ALINHAR[l.alinhar ?? 'esquerda'];
  if (!grande) return `<div class="${classes}" style="text-align:${alinhar}">${escapar(l.texto) || '&nbsp;'}</div>`;
  // Letra grande sem `transform`: o Chrome imprime trecho transformado como
  // imagem (borrado na térmica). Fonte maior de verdade, e o par rótulo/valor
  // vira duas pontas em vez de espaços que estouravam a largura.
  const par = l.texto.trim().match(DUAS_COLUNAS);
  if (par) return `<div class="${classes} par"><span>${escapar(par[1])}</span><span>${escapar(par[2])}</span></div>`;
  return `<div class="${classes}" style="text-align:${alinhar}">${escapar(l.texto.trim()) || '&nbsp;'}</div>`;
};

export const htmlDaComanda = (linhas: LinhaDaComanda[], colunas: number): string => {
  // Bobina de 80 mm imprime ~72 mm; 58 mm imprime ~48 mm. Monoespaçada: 1ch = 0,6em (Courier; Consolas é mais estreita e sobra).
  const util = colunas <= 32 ? 48 : 72;
  const fonte = (util / (colunas * 0.6)).toFixed(2);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Comanda</title><style>
@page { margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Consolas, 'Lucida Console', 'Courier New', monospace; color: #000; -webkit-font-smoothing: none; }
.papel { width: ${util}mm; padding: 2mm ${colunas <= 32 ? 3 : 4}mm; font-size: ${fonte}mm; font-weight: 600; }
.l { white-space: pre; line-height: 1.3; min-height: 1.3em; overflow: hidden; }
.g { white-space: pre-wrap; font-size: 1.6em; line-height: 1.15; font-weight: 800; }
.par { display: flex; justify-content: space-between; align-items: baseline; gap: .6em; }
.par span:last-child { white-space: nowrap; }
.b { font-weight: 800; }
.inv { background: #000; color: #fff; padding: 0 .3em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.corte { page-break-after: always; break-after: page; height: 4mm; }
</style></head><body><div class="papel">${linhas.map(linhaHtml).join('')}</div></body></html>`;
};
