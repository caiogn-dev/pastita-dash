/**
 * Catraca de campo e rótulo à mão (14/10). Medido em 13/10: 338 campos de
 * texto crus em 93 arquivos e 216 rótulos montados à mão em 57 — cada tela
 * pedia preço, telefone e foto do seu jeito. O jeito agora é o kit: `Campo`,
 * `Input`, `CampoDeDinheiro`, `CampoDeTelefone`, `EnvioDeImagem`.
 *
 * Regra: nenhum arquivo ganha campo cru ou rótulo à mão além da linha de base.
 * Arquivo novo nasce com zero. Migrou uma tela? `node scripts/campos-baseline.mjs`.
 * O kit (`components/ui`) fica de fora: é lá que o campo cru PODE morar.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..');
const CAMPO_CRU = /<(input|select|textarea)\b/g;
const ROTULO_A_MAO = /<label\b[^>]*className=/g;

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      if (caminho.endsWith(join('components', 'ui'))) continue;
      arquivos(caminho, acc);
    } else if (/\.tsx$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

function contar(): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const arq of arquivos(SRC)) {
    const fonte = readFileSync(arq, 'utf8');
    const n = (fonte.match(CAMPO_CRU) || []).length + (fonte.match(ROTULO_A_MAO) || []).length;
    if (n > 0) contagem[arq.split('/src/')[1]] = n;
  }
  return contagem;
}

describe('campos e rótulos à mão', () => {
  it('nenhum arquivo ganha campo cru ou rótulo à mão além da linha de base', () => {
    const base = JSON.parse(readFileSync(join(__dirname, 'camposCrus.baseline.json'), 'utf8')) as Record<string, number>;
    const pioraram = Object.entries(contar())
      .filter(([arq, n]) => n > (base[arq] ?? 0))
      .map(([arq, n]) => `${arq}: ${n} (base ${base[arq] ?? 0})`);
    expect(pioraram).toEqual([]);
  });
});
