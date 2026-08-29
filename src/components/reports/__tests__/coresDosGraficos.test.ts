import * as fs from 'fs';
import * as path from 'path';

/**
 * Gráfico não pinta com cor crua.
 *
 * O docstring do próprio `TimeSeriesChart` já dizia o motivo:
 *
 *   "Antes cada página desenhava um <AreaChart> inline com cores fixas
 *    (#166534, #e5e7eb, #6b7280) que não seguiam o tema nem a marca. Este
 *    componente centraliza isso."
 *
 * A centralização aconteceu — e dois chamadores continuaram passando hex
 * cravado: o faturamento em `#166534` (verde escuro, num painel de ouro sobre
 * carvão) e os cancelamentos em `#dc2626`. Cor crua ignora o tema: no escuro
 * ela não clareia, e no claro não escurece.
 *
 * A regra: a cor vem de token. `var(--brand)` para a série da marca,
 * `var(--danger)` para o que é ruim, e assim por diante — os mesmos tokens que
 * o resto do painel usa.
 */

const RAIZ = path.join(__dirname, '..', '..', '..');

const arquivosDeTela = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      return ['__tests__', 'node_modules'].includes(e.name) ? [] : arquivosDeTela(p);
    }
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : [];
  });

describe('cor de gráfico', () => {
  const arquivos = arquivosDeTela(RAIZ);

  it('encontra as telas para inspecionar', () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });

  it('nenhum gráfico recebe cor em hex cravado', () => {
    const achados: string[] = [];

    for (const arquivo of arquivos) {
      const fonte = fs.readFileSync(arquivo, 'utf8');
      // `color="#..."` ou `color={'#...'}` — a prop de cor de série.
      const cru = fonte.match(/color=\{?["']#[0-9a-fA-F]{3,8}["']\}?/g);
      if (cru) {
        achados.push(`${path.relative(RAIZ, arquivo)} → ${cru.join(', ')}`);
      }
    }

    expect(achados).toEqual([]);
  });
});
