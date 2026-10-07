import * as fs from 'fs';
import * as path from 'path';

/**
 * O recuo da navbar anda na MESMA curva da coluna.
 *
 * Na espiada a coluna cresce de 72 para 256px com `--desliza`, e a navbar
 * ganha 184px de recuo para acompanhar. O recuo usava `--mola`, que passa do
 * ponto — e `tokens.css` já avisava: péssima para largura. Medido no
 * Chromium a cada 20ms: o recuo chegava a 202px com a coluna em 252px (o
 * conteúdo da barra passava 18px além da borda e voltava) e, ao sair, caía a
 * 24px com a coluna ainda em 108px — o "Central de Pedidos" deslizava por
 * baixo da coluna que encolhia.
 */
const fonte = (arquivo: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', arquivo), 'utf8');

const curvaDepoisDe = (texto: string, marcador: RegExp): string => {
  const i = texto.search(marcador);
  if (i < 0) throw new Error(`não achei ${marcador}`);
  const m = texto.slice(i).match(/transitionTimingFunction:\s*'var\((--[\w-]+)\)'/);
  if (!m) throw new Error(`sem curva depois de ${marcador}`);
  return m[1];
};

describe('navbar acompanha a coluna espiada', () => {
  it('o recuo usa a mesma curva da largura da coluna', () => {
    const curvaDaColuna = curvaDepoisDe(fonte('Sidebar.tsx'), /'coluna-lateral /);
    const curvaDoRecuo = curvaDepoisDe(fonte('Navbar.tsx'), /paddingLeft: 'var\(--recuo-da-navbar/);
    expect(curvaDoRecuo).toBe(curvaDaColuna);
  });

  it('nenhuma das duas usa a curva que passa do ponto', () => {
    expect(curvaDepoisDe(fonte('Navbar.tsx'), /paddingLeft: 'var\(--recuo-da-navbar/)).not.toBe('--mola');
  });
});
