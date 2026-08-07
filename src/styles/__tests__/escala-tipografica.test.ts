/**
 * Tamanho de texto vem da escala, não do call site.
 *
 * Em 07/ago o painel tinha 1.800 tamanhos escritos à mão nos componentes —
 * 57x `text-[10px]`, 38x `text-[11px]`, 565x `text-xs`, 1.143x `text-sm` — e
 * nenhuma escala. Subir o piso de legibilidade de 10px para 11px exigia editar
 * 119 lugares, um a um.
 *
 * Pior: a MESMA composição de rótulo de seção aparecia 17 vezes idêntica e
 * dezenas de vezes com diferenças acidentais (`font-bold` num lugar,
 * `font-semibold` no outro; `tracking-wider` aqui, `tracking-widest` ali), e
 * várias delas pintavam com `text-gray-400 dark:text-zinc-500` — paleta crua
 * do Tailwind, furando os tokens do tema.
 *
 * Agora o consumidor pede o PAPEL (`overline`, `caption`, `badge`) e o tamanho
 * mora em `tokens.css`. Mudar o piso é mudar uma linha.
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

describe('escala tipográfica', () => {
  const arquivos = arquivosDeCodigo(RAIZ);

  it('nenhum componente define tamanho de fonte em pixel cru', () => {
    // `text-[13px]` e afins voltam a espalhar a decisão pelo call site: o
    // próximo ajuste de legibilidade vira outra caçada de 119 lugares.
    const infratores: string[] = [];
    for (const arq of arquivos) {
      const linhas = readFileSync(arq, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        if (/text-\[\d+px\]/.test(linha)) {
          infratores.push(`${arq.replace(RAIZ, 'src')}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });

  it('nenhum texto abaixo de 11px', () => {
    // Piso de leitura para um painel usado em pé, na cozinha, celular na mão.
    const tokens = readFileSync(join(RAIZ, 'styles', 'tokens.css'), 'utf8');
    const tamanhos = [...tokens.matchAll(/--text-[\w-]+:\s*([\d.]+)rem/g)].map((m) =>
      parseFloat(m[1]) * 16
    );

    expect(tamanhos.length).toBeGreaterThan(0);
    expect(Math.min(...tamanhos)).toBeGreaterThanOrEqual(11);
  });

  it('a escala existe e cobre os papéis usados', () => {
    const tokens = readFileSync(join(RAIZ, 'styles', 'tokens.css'), 'utf8');
    for (const papel of ['overline', 'badge', 'caption', 'body', 'lead']) {
      expect(tokens).toContain(`--text-${papel}:`);
    }
  });
});
