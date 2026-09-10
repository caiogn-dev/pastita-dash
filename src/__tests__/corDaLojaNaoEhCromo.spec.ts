/**
 * ESPECIFICAÇÃO — a cor da LOJA não pinta o painel.
 *
 * `primary-*` é a marca do lojista: o painel lê a cor da loja selecionada e a
 * publica nessas variáveis para as PRÉVIAS (cardápio, mini-site, comanda). Usar
 * a mesma cor no cromo do painel tem duas consequências:
 *
 *   1. Trocar de loja repinta botões, abas e paginação. O operador aprende a
 *      interface por cor, e a cor muda embaixo dele.
 *   2. Numa loja de marca vermelha — a Cê Saladas é terracota — tudo que está
 *      LIGADO, selecionado ou ativo fica vermelho: a mesma cor que este painel
 *      usa para erro e para excluir. Foi assim que a chave ligada do Link na
 *      Bio virou um alerta.
 *
 * O cromo do painel usa `brand` (o ouro), que é constante. Este teto só desce.
 * Ao encostar num arquivo desta lista, converta e baixe o número.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Arquivos que ainda pintam cromo com a cor da loja. Só diminui. */
const TETO = 28;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });

describe('spec: cromo do painel é constante', () => {
  it('não cresce o número de telas pintadas com a cor da loja', () => {
    const pintados = arquivos(SRC).filter((f) => {
      const fonte = fs
        .readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      return /(?:bg|text|border|ring|accent|from|to|via)-primary-\d/.test(fonte);
    });
    expect(pintados.length).toBeLessThanOrEqual(TETO);
  });
});
