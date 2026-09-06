/**
 * ESPECIFICAÇÃO — o anel de foco é UM, e é o da marca.
 *
 * O painel tinha CINCO anéis de foco convivendo: `ring-brand`, `ring-brand-500`,
 * `ring-primary-500`, `ring-indigo-500`, `ring-green-500` e `ring-blue-500`.
 * Com os valores na mão, a diferença deixa de ser gosto:
 *
 *   ring-brand        var(--brand)         #C9A24B claro / #DEBE79 escuro
 *   ring-brand-500    var(--brand-primary) → var(--primary-500) → #C7492E
 *   ring-primary-500  var(--primary-500)                          #C7492E
 *
 * Ou seja: o ouro da identidade, que ACOMPANHA o tema, contra o terracota do
 * storefront, que não acompanha — e que num tenant é a cor da loja, então o
 * anel de foco do painel mudava conforme a loja selecionada. Quem navega por
 * teclado percorria uma barra de filtros e via o realce trocar de cor entre um
 * campo e o outro; o indicador de foco vira efeito da página em vez de
 * "você está AQUI".
 *
 * Índigo, azul e verde nem existem na paleta — vieram de exemplos de Tailwind
 * colados. Num painel carvão-e-ouro, um anel índigo é de outro produto.
 *
 * O `focus:border-*` que acompanhava alguns deles saiu junto: o anel já marca
 * o foco, e a borda colorida por baixo era mais uma cor para divergir.
 *
 * Hoje o número é ZERO e só pode continuar zero.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Eram 32 arquivos. Hoje é zero, e zero é o teto. */
const TETO = 0;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('spec: anel de foco', () => {
  it(`nenhum arquivo usa anel de foco fora da marca`, () => {
    const fora = arquivos(SRC)
      .filter((f) => {
        const fonte = fs
          .readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        return /focus:(ring|border)-(brand|indigo|primary|blue|green|purple)-\d/.test(fonte);
      })
      .map((f) => path.relative(SRC, f))
      .sort();

    expect(fora.length <= TETO ? fora.length : fora).toBeLessThanOrEqual(TETO);
  });
});
