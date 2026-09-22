/**
 * A superfície de cartão é uma decisão, não 75.
 *
 * Levantamento de 21/09: 75 lugares escreviam à mão a mesma combinação
 * `rounded-… border border-border-token bg-surface…` — com QUATRO raios
 * diferentes (lg, xl, 2xl) e dois fundos. É o que faz a tela parecer montada
 * por pessoas diferentes: um cartão de 8px encostado num de 16px.
 *
 * A classe `.superficie` junta fundo, borda, raio e elevação. Quem precisa de
 * cartão escreve uma palavra.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..');
const css = readFileSync(join(SRC, 'index.css'), 'utf8');

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

describe('superfície de cartão', () => {
  it('a classe existe e traz fundo, borda, raio e elevação', () => {
    const bloco = css.slice(css.indexOf('.superficie'), css.indexOf('.superficie') + 400);
    expect(bloco).toContain('bg-surface');
    expect(bloco).toContain('border-border-token');
    expect(bloco).toContain('rounded-xl');
    expect(bloco).toContain('shadow-repouso');
  });

  it('ninguém remonta a superfície à mão', () => {
    const infratores: string[] = [];
    for (const arq of arquivos(SRC)) {
      readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
        if (/rounded-(lg|xl|2xl)\s+border\s+border-border-token\s+bg-surface/.test(linha)) {
          infratores.push(`${arq.split('/src/')[1]}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });
});
