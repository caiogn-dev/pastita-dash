/**
 * ESPECIFICAÇÃO — a espera é UMA, e ela fala.
 *
 * Vinte e oito arquivos desenhavam o próprio spinner, em quatorze variações de
 * classe. Existia um `Loading` comum e ninguém usava — pelos três defeitos que
 * a spec dele documenta: cor terracota do storefront em vez do ouro da marca
 * (num tenant, a cor DA LOJA: o spinner do painel mudava conforme a loja
 * selecionada), traço fino em vez do anel cheio, e nenhum `role="status"`.
 *
 * O terceiro é o que custa caro: sem papel, um spinner é uma animação sem
 * nome. Quem usa leitor de tela não ouve NADA — nem que começou a carregar,
 * nem que terminou. A página simplesmente emudece.
 *
 * Este teste conta quem ainda monta o anel à mão. O `animate-spin` sozinho
 * continua livre: é o que gira o ícone de "atualizar" num botão, e ali ele é
 * decoração de um controle que já tem nome.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Arquivos que ainda montam o anel de espera do zero. */
const TETO = 0;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });

describe('spec: espera única', () => {
  it('nenhuma tela monta o próprio anel de espera', () => {
    const artesanais = arquivos(SRC)
      .filter((f) => !f.endsWith(path.join('common', 'Loading.tsx')))
      .filter((f) => {
        const fonte = fs
          .readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        // O anel: borda + vão + giro. É esta combinação que se repetia.
        return /border-t-transparent[^"]*animate-spin|animate-spin[^"]*border-t-transparent/.test(
          fonte,
        );
      })
      .map((f) => path.relative(SRC, f))
      .sort();

    expect(artesanais.length <= TETO ? artesanais.length : artesanais).toBeLessThanOrEqual(TETO);
  });
});
