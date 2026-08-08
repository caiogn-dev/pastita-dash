/**
 * Raio de borda vem da escala, não do call site.
 *
 * Em 08/ago o painel usava DEZ raios diferentes em 2.128 lugares: `rounded`
 * (4px) 1.244x, `rounded-lg` 359x, `rounded-full` 225x, `rounded-md` 103x,
 * `rounded-xl` 158x, `rounded-2xl` 33x, `rounded-3xl`, `rounded-[…]`. Um card
 * de 4px encostado num de 16px é o que faz a tela parecer montada por duas
 * pessoas — e o 4px sozinho é o que a deixava quadradona.
 *
 * A escala mora em tokens.css e os nomes do Tailwind apontam para ela, então
 * os usos existentes herdaram o sistema sem edição em massa. Este teste impede
 * a volta: raio em pixel cru no componente espalha a decisão de novo.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const RAIZ = join(__dirname, '..', '..');

function arquivosDeCodigo(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      arquivosDeCodigo(caminho, acc);
    } else if (/\.(tsx|ts)$/.test(nome)) {
      acc.push(caminho);
    }
  }
  return acc;
}

describe('escala de raio', () => {
  it('nenhum componente define raio em pixel cru', () => {
    const infratores: string[] = [];
    for (const arq of arquivosDeCodigo(RAIZ)) {
      readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
        // `rounded-[12px]` e `borderRadius: '12px'` voltam a espalhar a
        // decisão: o próximo ajuste de personalidade vira outra caçada.
        if (/rounded-\[\d+px\]|borderRadius:\s*['"`]\d+px/.test(linha)) {
          infratores.push(`${arq.replace(RAIZ, 'src')}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });

  it('a escala existe e cobre os papéis', () => {
    const tokens = readFileSync(join(RAIZ, 'styles', 'tokens.css'), 'utf8');
    for (const papel of ['xs', 'sm', 'lg', 'xl', '2xl', 'pill']) {
      expect(tokens).toContain(`--radius-${papel}:`);
    }
    expect(tokens).toMatch(/--radius:\s*\d+px/);
  });

  it('o padrão deixou de ser quase-quadrado', () => {
    // 4px lê como canto reto em tela cheia. Abaixo de 8 o arredondamento não
    // é percebido como intenção — parece defeito de renderização.
    const tokens = readFileSync(join(RAIZ, 'styles', 'tokens.css'), 'utf8');
    const padrao = Number(/--radius:\s*(\d+)px/.exec(tokens)?.[1]);
    expect(padrao).toBeGreaterThanOrEqual(8);
  });

  it('a escala é crescente, sem degraus invisíveis', () => {
    // Dois passos com 1px de diferença não são dois passos: são ruído que
    // ninguém consegue aplicar com critério.
    const tokens = readFileSync(join(RAIZ, 'styles', 'tokens.css'), 'utf8');
    const val = (n: string) =>
      Number(new RegExp(`--radius-${n}:\\s*(\\d+)px`).exec(tokens)?.[1]);
    const escala = [val('xs'), val('sm'), Number(/--radius:\s*(\d+)px/.exec(tokens)?.[1]), val('lg'), val('xl'), val('2xl')];
    for (let i = 1; i < escala.length; i += 1) {
      expect(escala[i] - escala[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });
});
