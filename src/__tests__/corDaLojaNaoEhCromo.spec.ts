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
const TETO = 20;

/**
 * Cinza cru — `zinc-400`, `gray-900` — é o mesmo problema com outra roupa.
 *
 * O painel tem dois temas; a cor crua só serve a um, e quem escreve resolve
 * pregando um `dark:` ao lado. São duas decisões onde deveria haver uma, e
 * basta esquecer metade para a tela ficar branca no escuro. O token responde
 * pelos dois.
 */
const TETO_CRU = 49;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });

const pintadosCom = (regex: RegExp) =>
  arquivos(SRC).filter((f) => {
    const fonte = fs
      .readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    return regex.test(fonte);
  });

describe('spec: cromo do painel é constante', () => {
  it('não cresce o número de telas pintadas com a cor da loja', () => {
    const pintados = pintadosCom(/(?:bg|text|border|ring|accent|from|to|via)-primary-\d/);
    expect(pintados.length).toBeLessThanOrEqual(TETO);
  });

  /**
   * `brand-400/500/600` NÃO é a marca: o `index.css` aponta os três para
   * `primary-400/500/600`. É a cor da loja com nome de marca, e passava batido
   * pela regra acima justamente por causa do nome. A marca de verdade é
   * `brand` (e `brand-soft`, `brand-hover`, `brand-ink`), sem número.
   */
  it('nem com nome de marca — `brand-500` é `primary-500` disfarçado', () => {
    const disfarcados = pintadosCom(/(?:bg|text|border|ring|from|to|via)-brand-(?:400|500|600)\b/);
    expect(disfarcados.map((f) => path.relative(SRC, f))).toHaveLength(0);
  });

  it('não cresce o número de telas com cinza cru em vez de token', () => {
    const pintados = pintadosCom(
      /(?:bg|text|border|divide|placeholder|ring)-(?:zinc|gray|slate|neutral|stone)-\d{2,3}/,
    );
    expect(pintados.length).toBeLessThanOrEqual(TETO_CRU);
  });
});
