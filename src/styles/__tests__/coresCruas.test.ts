/**
 * Catraca de cor crua. Medido em 25/09: Pedidos 73, Pagamentos 70, Dashboard
 * 47, Clientes 39… cada uma com a sua paleta — é por isso que a identidade
 * "varia de página para página". Os tokens existem desde agosto; o que
 * faltava era impedir a volta.
 *
 * Regra: nenhum arquivo pode ter MAIS cores cruas do que tinha na linha de
 * base. Arquivo novo nasce com zero. Quando uma página é migrada, a linha de
 * base cai junto (rode `npm run cores:baseline`).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';


const SRC = join(__dirname, '..', '..');
export const COR_CRUA = /\b(bg|text|border|ring|from|to|via)-(gray|slate|zinc|neutral|stone|blue|green|red|yellow|purple|indigo|pink|amber|emerald|orange|teal|rose|violet|cyan|sky|lime|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)\b/g;

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      arquivos(caminho, acc);
    } else if (/\.tsx$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

export function contarCoresCruas(): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const arq of arquivos(SRC)) {
    const n = (readFileSync(arq, 'utf8').match(COR_CRUA) || []).length;
    if (n > 0) contagem[arq.split('/src/')[1]] = n;
  }
  return contagem;
}

describe('cores cruas do Tailwind', () => {
  it('nenhum arquivo ganha cor crua além da linha de base', () => {
    const atual = contarCoresCruas();
    const base = JSON.parse(readFileSync(join(__dirname, 'coresCruas.baseline.json'), 'utf8')) as Record<string, number>;
    const pioraram = Object.entries(atual)
      .filter(([arq, n]) => n > (base[arq] ?? 0))
      .map(([arq, n]) => `${arq}: ${n} (base ${base[arq] ?? 0})`);
    expect(pioraram).toEqual([]);
  });
});
