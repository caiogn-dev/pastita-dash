/**
 * ESPECIFICAÇÃO — o anel de foco é UM, e é o da marca.
 *
 * O painel tinha três anéis de foco convivendo: `focus:ring-brand` (o certo),
 * `focus:ring-primary-500` e `focus:ring-indigo-500`. Não é gosto: quem navega
 * por teclado percorre uma barra de filtros e vê o realce mudar de cor de um
 * campo para o outro, o que faz o indicador de foco parecer um efeito da
 * página em vez de "você está AQUI".
 *
 * `primary-500` e `indigo-500` também não são cores da paleta — vieram de um
 * exemplo de Tailwind colado. Num painel carvão-e-ouro, um anel índigo é de
 * outro produto.
 *
 * Este teste trava o número: cada campo migrado para `Select`/`SearchInput`
 * baixa o teto, e nenhum anel novo entra fora da marca.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/**
 * Arquivos que ainda pintam anel de foco fora da marca.
 *
 * Eram 32 antes do `Select` e do `SearchInput` comuns. Cada campo migrado
 * baixa este número; ele só pode descer.
 */
const TETO = 26;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('spec: anel de foco', () => {
  it(`no máximo ${TETO} arquivos usam anel fora da marca`, () => {
    const fora = arquivos(SRC)
      .filter((f) => {
        const fonte = fs
          .readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        return /focus:ring-(indigo|primary|blue|green|purple)-\d/.test(fonte);
      })
      .map((f) => path.relative(SRC, f))
      .sort();

    expect(fora.length <= TETO ? fora.length : fora).toBeLessThanOrEqual(TETO);
  });
});
