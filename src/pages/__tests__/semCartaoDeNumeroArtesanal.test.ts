/**
 * Cartão de número desenhado à mão perde a DEFINIÇÃO do indicador.
 *
 * Treze telas escreviam o próprio `text-2xl font-bold` dentro de um `Card`,
 * cada uma com o seu chip de cor crua — blue-100, green-100, purple-100,
 * orange-100, emerald-600, indigo-600. Nenhuma dessas cores existe na paleta
 * do painel, então a mesma tela ficava com cinco vocabulários de cor.
 *
 * Mas o problema maior não é a cor. `KpiGrid` EXIGE `definicao`, e cartão à
 * mão não exige nada — foi assim que a tela mostrou:
 *
 *  - "Integrações Ativas" sem dizer o que conta como integração;
 *  - "Taxa de Sucesso" que era só do fluxo PADRÃO, sem dizer isso: quem lesse
 *    achava que era a média de todos;
 *  - "Abertos" sem o denominador ao lado — o número absoluto sozinho não diz
 *    se a campanha foi bem;
 *  - "Eventos com falha" sem explicar que cada falha é uma mensagem que o
 *    cliente mandou e ninguém viu.
 *
 * Número que o dono não sabe conferir é número que ele não usa para decidir.
 *
 * O que sobra é legítimo e este teste não persegue: mini-números DENTRO de um
 * cartão de loja (outra escala) e o painel de relatórios, que tem componentes
 * próprios de gráfico.
 */
import * as fs from 'fs';
import * as path from 'path';

const PASTA = path.join(__dirname, '..');

/** Quantas telas ainda escrevem o valor do indicador à mão. */
const TETO = 6;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });

describe('cartões de número', () => {
  it(`no máximo ${TETO} telas desenham o próprio cartão de indicador`, () => {
    const artesanais = arquivos(PASTA)
      .filter((f) => {
        const fonte = fs
          .readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        return /text-2xl font-bold/.test(fonte);
      })
      .map((f) => path.relative(PASTA, f))
      .sort();

    expect(artesanais.length <= TETO ? artesanais.length : artesanais).toBeLessThanOrEqual(TETO);
  });
});
