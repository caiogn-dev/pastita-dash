/**
 * A peneira que impede a duplicação de voltar.
 *
 * O dono, olhando o painel: "NADA ESTA COMPONENTIZADO... TUDO SE REPLICA
 * PRATICAMENTE, VOCE NAO PERCEBE..?". Ele estava certo, e o número era 20 —
 * vinte páginas com o próprio `<thead>`, cada uma com o seu padding, a sua cor
 * de cabeçalho, o seu jeito de dizer "nenhum resultado" e o seu menu kebab.
 *
 * Existia um `organisms/DataTable` que NINGUÉM usava, e o motivo estava no
 * fonte: ele pintava `zinc-50`/`zinc-900` direto em vez dos tokens do tema, e
 * entrava numa tela carvão-e-ouro como um retângulo de outro produto.
 * Componente que não combina com o tema não é reaproveitado — é contornado.
 * Ele foi apagado.
 *
 * Este teste não exige que TUDO já esteja convertido: exige que o número não
 * suba. Cada conversão baixa o teto; nenhuma tabela nova entra à mão.
 */
import * as fs from 'fs';
import * as path from 'path';

const PASTA = path.join(__dirname, '..');

/** Quantas páginas ainda desenham `<thead>` por conta própria. */
const TETO = 13;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });

describe('tabelas do painel', () => {
  const artesanais = arquivos(PASTA).filter((f) =>
    fs.readFileSync(f, 'utf8').includes('<thead'),
  );

  it(`no máximo ${TETO} páginas ainda desenham a própria tabela`, () => {
    // Falhando, a lista sai no diff: quem quebrou o teto vê exatamente onde.
    const lista = artesanais.map((f) => path.relative(PASTA, f)).sort();

    expect(lista.length <= TETO ? lista.length : lista).toBeLessThanOrEqual(TETO);
  });

  it('o DataTable de paleta errada não voltou', () => {
    // 218 linhas de código morto com `zinc-` cru. Se voltar, volta o motivo de
    // ninguém usar o componente comum.
    expect(fs.existsSync(path.join(PASTA, '..', 'components', 'organisms'))).toBe(false);
  });
});
