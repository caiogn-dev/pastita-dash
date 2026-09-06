/**
 * ESPECIFICAÇÃO — dinheiro tem UMA fonte, e ela é `utils/formatters`.
 *
 * Esta spec não testa comportamento: testa a ARQUITETURA. Ela existe porque o
 * defeito não foi um formatador errado, foi dezoito formatadores certos-por-si
 * e divergentes entre si. Nenhum teste de comportamento pega isso — cada um
 * passava no seu próprio arquivo.
 *
 * O que ela impede, concretamente:
 *
 *  - Zonas de entrega tinha `toFixed(2)` e mostrava "R$ 12.00", com PONTO, na
 *    tela onde o dono confere o preço do frete.
 *  - Sete formatadores passavam só `minimumFractionDigits` e deixavam três
 *    casas decimais chegarem à tela.
 *  - Havia DOIS `formatCurrency` exportados, com o mesmo nome, de arquivos
 *    diferentes. Importar o errado era um autocomplete de distância.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');

/** A própria fonte única, e os módulos que legitimamente falam outra língua. */
const PERMITIDOS = [
  path.join('utils', 'formatters.ts'),
  // Eixo de gráfico abrevia ("R$ 1,5 mil"): outra regra, testada à parte.
  path.join('utils', 'formatAxisCurrency.ts'),
  // Variáveis do template da Meta vão SEM moeda — o "R$" é fixo no corpo
  // aprovado. Ver `variaveisDaOferta.ts`.
  path.join('marketing', 'whatsapp', 'variaveisDaOferta.ts'),
  // Etiqueta impressa tem largura de coluna em caracteres, não é tela.
  path.join('utils', 'labelPrint.ts'),
];

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : arquivos(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('spec: fonte única de dinheiro', () => {
  const suspeitos = arquivos(SRC)
    .filter((f) => !PERMITIDOS.some((ok) => f.endsWith(ok)))
    .filter((f) => {
      const fonte = fs
        .readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      // Quem monta moeda por conta própria: `style: 'currency'` ou o par
      // `minimumFractionDigits` num `toLocaleString('pt-BR')`.
      return (
        /style:\s*'currency'/.test(fonte) ||
        /toLocaleString\('pt-BR',\s*\{[^}]*FractionDigits/.test(fonte)
      );
    })
    .map((f) => path.relative(SRC, f))
    .sort();

  it('nenhum módulo formata moeda por conta própria', () => {
    // Falhando, a lista sai no diff: é onde o formatador novo nasceu.
    expect(suspeitos).toEqual([]);
  });

  it('existe UM `formatCurrency` exportado em todo o src', () => {
    const definicoes = arquivos(SRC).filter((f) =>
      /export (const|function) formatCurrency\b/.test(fs.readFileSync(f, 'utf8')),
    );

    expect(definicoes.map((f) => path.relative(SRC, f))).toEqual([
      path.join('utils', 'formatters.ts'),
    ]);
  });
});
