import {
  margemEsquerda, blocoMm, escalaDoCanvas, moverElemento, redimensionarElemento, novoElemento, textoDeExemplo,
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

import {
  encaixar, redimensionarPorAlca, guiasDoLayout, encaixarNasGuias, duplicarElemento, moverCamada, Historico,
  nomeDoElemento,
} from '../editorDeEtiqueta';

describe('designer — alças, guias, camadas e histórico', () => {
  it('encaixa em 0,5 mm por padrão', () => {
    expect(encaixar(3.26)).toBe(3.5); expect(encaixar(3.24)).toBe(3); expect(encaixar(3.26, 0.1)).toBe(3.3);
  });

  it('alça direita-baixo muda só largura e altura; alça esquerda move X e encolhe W', () => {
    const l = base();
    const a = redimensionarPorAlca(l, 'val', 'sd', 2, 1);       // sudeste
    expect(a.elementos[1]).toMatchObject({ x: 1.6, y: 17.6, w: 31.4, h: 4.4 });
    const b = redimensionarPorAlca(l, 'val', 'o', 1, 0);         // oeste: x avança, w encolhe
    expect(b.elementos[1]).toMatchObject({ x: 2.6, w: 28.8 });
    const c = redimensionarPorAlca(l, 'val', 'n', 0, -100);      // norte: y não passa de 0
    expect(c.elementos[1].y).toBe(0);
    expect(c.elementos[1].h).toBeCloseTo(17.6 + 3.4, 5);
    const d = redimensionarPorAlca(l, 'val', 'sd', -100, -100);  // nunca menor que 0,5
    expect(d.elementos[1].w).toBe(0.5); expect(d.elementos[1].h).toBe(0.5);
  });

  it('guias: bordas e centro da etiqueta + bordas dos outros elementos', () => {
    const g = guiasDoLayout(base(), 'val');
    expect(g.x).toEqual(expect.arrayContaining([0, 16.5, 33, 1.6, 31.4]));
    expect(g.y).toEqual(expect.arrayContaining([0, 11, 22, 1.4, 10.4]));
    expect(g.y).not.toContain(17.6);   // o próprio elemento não vira guia dele mesmo
  });

  it('encaixar nas guias puxa borda ou centro quando passa perto', () => {
    const g = { x: [0, 16.5, 33], y: [0, 11, 22] };
    // borda esquerda em 0,3 → 0; nada em y
    expect(encaixarNasGuias({ x: 0.3, y: 5, w: 10, h: 2 }, g, 0.5)).toEqual({ x: 0, y: 5, guiaX: 0, guiaY: null });
    // centro em 16,6 (x 11,6 + 5) → centraliza em 16,5
    expect(encaixarNasGuias({ x: 11.6, y: 5, w: 10, h: 2 }, g, 0.5)).toEqual({ x: 11.5, y: 5, guiaX: 16.5, guiaY: null });
    // longe de tudo: não mexe
    expect(encaixarNasGuias({ x: 5, y: 5, w: 3, h: 2 }, g, 0.5)).toEqual({ x: 5, y: 5, guiaX: null, guiaY: null });
  });

  it('duplicar cria cópia deslocada com id novo; mover camada troca a ordem', () => {
    const l = duplicarElemento(base(), 'nome');
    expect(l.elementos).toHaveLength(3);
    expect(l.elementos[2]).toMatchObject({ x: 2.6, y: 2.4, texto: '{name}' });
    expect(l.elementos[2].id).not.toBe('nome');
    expect(moverCamada(base(), 'nome', 'cima').elementos.map((e) => e.id)).toEqual(['val', 'nome']);
    expect(moverCamada(base(), 'nome', 'baixo').elementos.map((e) => e.id)).toEqual(['nome', 'val']);
  });

  it('histórico: desfaz e refaz, e um novo passo apaga o futuro', () => {
    const h = new Historico(base());
    const l2 = moverElemento(base(), 'val', 1, 0);
    h.gravar(l2);
    expect(h.podeDesfazer).toBe(true); expect(h.podeRefazer).toBe(false);
    expect(h.desfazer()).toEqual(base());
    expect(h.podeRefazer).toBe(true);
    expect(h.refazer()).toEqual(l2);
    h.desfazer(); h.gravar(moverElemento(base(), 'val', 2, 0));
    expect(h.podeRefazer).toBe(false);
    expect(h.desfazer()).toEqual(base());
    expect(h.desfazer()).toBeNull();
  });

  it('nome legível do elemento para a lista de camadas', () => {
    expect(nomeDoElemento({ id: 'a', tipo: 'texto', x: 0, y: 0, w: 1, h: 1, texto: 'Val.: {val}' })).toBe('Val.: {val}');
    expect(nomeDoElemento({ id: 'a', tipo: 'qr', x: 0, y: 0, w: 1, h: 1, campo: 'publicUrl' })).toBe('QR Code');
    expect(nomeDoElemento({ id: 'a', tipo: 'barras', x: 0, y: 0, w: 1, h: 1 })).toBe('Código de barras');
  });
});

import { comPapel, temMargensMedidas, roloPelasMargens } from '../editorDeEtiqueta';

describe('margens medidas no rolo', () => {
  it('com as duas margens o rolo é a soma e a 1ª coluna começa na esquerda', () => {
    const l = comPapel(base(), { margem_esquerda: 3, margem_direita: 1 });
    expect(temMargensMedidas(l)).toBe(true);
    expect(roloPelasMargens(l)).toBe(107);
    expect(l.papel.largura).toBe(107);
    expect(margemEsquerda(l)).toBe(3);
    const m = comPapel(l, { colunas: 2 });
    expect(m.papel.largura).toBe(3 + 2 * 33 + 2 + 1);
  });
  it('sem as duas margens a largura do rolo é a digitada e a coluna centraliza', () => {
    const l = comPapel(base(), { margem_esquerda: 3 });
    expect(l.papel.largura).toBe(107); expect(margemEsquerda(l)).toBe(3);
    expect(margemEsquerda(base())).toBe(2);
  });
});

import { irmaosDoRolo } from '../editorDeEtiqueta';
describe('rolo compartilhado', () => {
  it('lista os modelos do mesmo rolo, sem o próprio', () => {
    const l = base(); const r = { ...l, papel: { ...l.papel, rolo: 'rolo-3-colunas' } }; const z = { ...l, papel: { ...l.papel, rolo: 'zebra-100' } };
    const layouts = { validade: { layout: r }, 'nutricao-qr': { layout: r }, produto: { layout: z }, nutricao: { layout: z } };
    expect(irmaosDoRolo(layouts, 'validade')).toEqual(['QR Nutrição']);
    expect(irmaosDoRolo(layouts, 'produto')).toEqual(['Tabela nutricional']);
    expect(irmaosDoRolo(null, 'validade')).toEqual([]);
  });
  it('texto novo nasce com linhas automáticas e caixa de 6 mm', () => {
    const l = novoElemento(base(), 'texto');
    expect(l.elementos[2]).toMatchObject({ linhas: 0, h: 6 });
  });
});
