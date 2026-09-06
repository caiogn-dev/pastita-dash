/**
 * Modal montado à mão não é só duplicação — é acessibilidade que não existe.
 *
 * Nove telas desenhavam o próprio `fixed inset-0 z-50` com um `<div>` por
 * cima. Medido: NENHUMA delas tem `role="dialog"`, `aria-modal`, trava de
 * foco ou fechar com Esc. Na prática:
 *
 *  - o leitor de tela não anuncia que abriu um diálogo, e continua lendo a
 *    página inteira atrás dele;
 *  - o Tab sai do modal e vai passear pelos botões do fundo — quem navega por
 *    teclado fica preso sem saber onde está;
 *  - Esc não fecha, e o fundo continua rolando junto.
 *
 * O `Modal` de components/ui já resolve os quatro, e ainda mantém contagem do
 * lock de rolagem para modal dentro de modal. Não era falta de componente:
 * era código antigo que ninguém migrou.
 *
 * Este teste trava o número. Só conta o que aparenta ser diálogo — sobreposição
 * de tela cheia com z-index — para não pegar `sticky`/`absolute` legítimos.
 *
 * Sobram DOIS, de propósito:
 *
 *  - `NewOrderDrawer` é gaveta lateral, não diálogo centralizado, e o `Modal`
 *    do painel não faz gaveta. Ele já tem `role="dialog"`, `aria-modal`, Esc e
 *    trava de rolagem escritos à mão — foi feito com cuidado, não por
 *    descuido.
 *  - `FullPageLoading` cobre a tela na ENTRADA do painel. Não é diálogo: é uma
 *    espera com `role="status"`, e dar-lhe trava de foco prenderia o teclado
 *    numa tela sem nada para focar.
 */
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.join(__dirname, '..', '..');

/** Quantos arquivos ainda montam a sobreposição do zero. */
const TETO = 2;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });

describe('modais do painel', () => {
  it(`no máximo ${TETO} arquivos montam a própria sobreposição`, () => {
    const artesanais = arquivos(RAIZ)
      .filter((f) => !f.endsWith(path.join('components', 'ui', 'modal.tsx')))
      .filter((f) => {
        // Sem comentários: um arquivo que EXPLICA por que deixou de montar a
        // sobreposição não pode contar como se ainda montasse.
        const fonte = fs
          .readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        return /fixed inset-0 z-50/.test(fonte);
      })
      .map((f) => path.relative(RAIZ, f))
      .sort();

    // Falhando, a lista sai no diff.
    expect(artesanais.length <= TETO ? artesanais.length : artesanais).toBeLessThanOrEqual(TETO);
  });
});
