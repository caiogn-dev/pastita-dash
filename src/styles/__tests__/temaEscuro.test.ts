/**
 * Fundo claro sem variante escura = etiqueta branca no painel escuro.
 *
 * Levantamento de 21/09: 208 fundos claros (`bg-blue-100`, `bg-green-50`…) e
 * só 47 com `dark:` ao lado. As outras 71 linhas pintavam chip claro no tema
 * escuro — o mesmo erro da borda cinza padrão, só que colorido.
 *
 * O painel tem tokens para isso desde sempre (`bg-success-soft`,
 * `bg-danger-soft`, `bg-warning-soft`, `bg-info-soft`), que viram de tom
 * sozinhos. Cor crua volta a quebrar.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..');
const CLARO = /\bbg-(red|green|blue|yellow|amber|orange|gray|slate|zinc|emerald|rose|indigo|purple|violet)-(50|100|200)\b/;

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

describe('tema escuro', () => {
  it('nenhum fundo claro fica sem par no escuro', () => {
    const infratores: string[] = [];
    for (const arq of arquivos(SRC)) {
      readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
        if (CLARO.test(linha) && !linha.includes('dark:bg-')) {
          infratores.push(`${arq.split('/src/')[1]}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });
});
