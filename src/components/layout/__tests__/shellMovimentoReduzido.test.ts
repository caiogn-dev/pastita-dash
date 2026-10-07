import * as fs from 'fs';
import * as path from 'path';

/**
 * Quem pediu movimento reduzido no sistema não vê a coluna deslizar 184px.
 *
 * O rótulo da coluna já respeitava `prefers-reduced-motion` (index.css,
 * `.entra-com-a-coluna`), mas a largura da coluna, a do invólucro e o recuo
 * da navbar animavam do mesmo jeito — o maior movimento do cromo era
 * justamente o que ignorava a preferência.
 */
const fonte = (arquivo: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', arquivo), 'utf8');

const linhasCom = (texto: string, marcador: RegExp) =>
  texto.split('\n').filter((l) => marcador.test(l) && !/^\s*\/\//.test(l));

describe('movimento reduzido no cromo', () => {
  it('toda transição de largura da coluna desliga com motion-reduce', () => {
    const linhas = linhasCom(fonte('Sidebar.tsx'), /transition-\[width\]/);
    expect(linhas.length).toBeGreaterThanOrEqual(2);
    for (const l of linhas) expect(l).toMatch(/motion-reduce:transition-none/);
  });

  it('o recuo da navbar desliga com motion-reduce', () => {
    const linhas = linhasCom(fonte('Navbar.tsx'), /transition-\[padding\]/);
    expect(linhas.length).toBeGreaterThanOrEqual(1);
    for (const l of linhas) expect(l).toMatch(/motion-reduce:transition-none/);
  });
});
