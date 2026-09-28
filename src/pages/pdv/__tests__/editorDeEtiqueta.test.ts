import {
  blocoMm, escalaDoCanvas, moverElemento, redimensionarElemento, novoElemento, textoDeExemplo,
  problemaDoLayout, ajustarPapelAoBloco, ETIQUETA_DE_EXEMPLO,
} from '../editorDeEtiqueta';
import type { LayoutDeEtiqueta } from '../../../services/printing';

const base = (): LayoutDeEtiqueta => ({
  versao: 1,
  etiqueta: { largura: 33, altura: 22 },
  papel: { largura: 107, colunas: 3, espaco: 2 },
  elementos: [
    { id: 'nome', tipo: 'texto', x: 1.6, y: 1.4, w: 29.8, h: 9, texto: '{name}', tamanho: 2.6, negrito: true, linhas: 3 },
    { id: 'val', tipo: 'texto', x: 1.6, y: 17.6, w: 29.8, h: 3.4, texto: 'Val.: {val}', tamanho: 2.8 },
  ],
});

describe('editor de etiqueta — geometria', () => {
  it('bloco = colunas × largura + vãos', () => {
    expect(blocoMm(base())).toBe(3 * 33 + 2 * 2);
  });

  it('escala do canvas cabe no espaço e nunca passa de 6 px/mm', () => {
    expect(escalaDoCanvas(107, 900)).toBe(6);
    expect(escalaDoCanvas(107, 321)).toBeCloseTo(3, 5);
  });

  it('mover arredonda a 0,1 mm e não deixa o elemento sair da etiqueta', () => {
    const l = moverElemento(base(), 'nome', 0.04, -5);
    const nome = l.elementos[0];
    expect(nome.x).toBe(1.6);
    expect(nome.y).toBe(0);           // bateu no topo
    const r = moverElemento(base(), 'nome', 50, 0);
    expect(r.elementos[0].x).toBeCloseTo(33 - 29.8, 5); // bateu na direita
    expect(moverElemento(base(), 'inexistente', 1, 1)).toEqual(base());
  });

  it('redimensionar respeita o mínimo e a borda', () => {
    const l = redimensionarElemento(base(), 'val', 100, 0.01);
    expect(l.elementos[1].w).toBe(33 - 1.6);
    expect(l.elementos[1].h).toBe(0.5);
  });

  it('elemento novo nasce com id único e defaults do tipo', () => {
    const l = base();
    const a = novoElemento(l, 'texto'); const b = novoElemento(a, 'qr');
    expect(a.elementos).toHaveLength(3); expect(b.elementos).toHaveLength(4);
    expect(a.elementos[2].id).not.toBe(b.elementos[3].id);
    expect(a.elementos[2].texto).toBe('Texto');
    expect(b.elementos[3].campo).toBe('publicUrl');
    expect(novoElemento(l, 'barras').elementos[2].campo).toBe('barcode');
  });

  it('texto de exemplo troca {campo} pelo exemplo e ignora o desconhecido', () => {
    expect(textoDeExemplo('Val.: {val} {nada}', ETIQUETA_DE_EXEMPLO)).toBe(`Val.: ${ETIQUETA_DE_EXEMPLO.val} `);
  });

  it('acusa papel menor que o bloco e etiqueta sem tamanho', () => {
    const l = base(); l.papel.largura = 100;
    expect(problemaDoLayout(l)).toMatch(/107|não cabe/i);
    const m = base(); m.etiqueta.largura = 0;
    expect(problemaDoLayout(m)).toMatch(/largura/i);
    expect(problemaDoLayout(base())).toBeNull();
  });

  it('ajustar papel ao bloco iguala a largura do papel ao que as colunas ocupam', () => {
    const l = base(); l.papel.largura = 100;
    expect(ajustarPapelAoBloco(l).papel.largura).toBe(103);
  });
});
