/**
 * ESPECIFICAÇÃO — nenhuma string de classe com caco.
 *
 * Uma troca automática de classes deixou `bg-brand-soft -soft` em cinco
 * lugares: a regex casou `dark:bg-brand` DENTRO de `dark:bg-brand-soft` (o
 * `\b` fecha antes do hífen) e removeu só o começo, deixando o rabo solto.
 *
 * Caco não quebra a tela — `-soft` simplesmente não é classe nenhuma — e é
 * exatamente por isso que passa: nada acusa, nem o compilador, nem o build,
 * nem o olho. Este teste acusa.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });

it('nenhuma classe começa com hífen', () => {
  const comCaco = arquivos(SRC).filter((f) =>
    // Dentro de aspas, um "token" que começa com hífen depois de espaço ou da
    // própria abertura. `-my-0.5` e `-mb-px` são classes de verdade (margem
    // negativa), então o caco é o que NÃO segue com letra+hífen+valor.
    /(['"`])[^'"`\n]*(?:^|\s)-(?:soft|hover|ink|token|brand|strong|muted)\b/.test(
      fs.readFileSync(f, 'utf8'),
    ),
  );
  expect(comCaco.map((f) => path.relative(SRC, f))).toHaveLength(0);
});
