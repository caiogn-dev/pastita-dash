/**
 * Recolher a coluna muda a LARGURA, não o tamanho do ícone.
 *
 * O ícone crescia de 20px para 24px ao recolher, com transição de tamanho: no
 * meio de uma coluna deslizando, o desenho também esticava. Dá aquele efeito
 * de "zoom" que denuncia animação feita à mão — a referência mantém o ícone do
 * mesmo tamanho sempre e anima só a largura da coluna.
 *
 * Ícone é sinal, não decoração: se ele muda de tamanho conforme o estado da
 * coluna, o olho lê como "outro ícone".
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const fonte = readFileSync(join(__dirname, '..', 'Sidebar.tsx'), 'utf8');

describe('coluna recolhida', () => {
  it('o ícone tem um tamanho só, nos dois estados', () => {
    const linha = fonte.split('\n').find((l) => l.includes('const tamIcone'));
    expect(linha).toBeTruthy();
    expect(linha).not.toMatch(/h-6 w-6/);
    expect(linha).toContain('h-5 w-5');
  });

  it('não existe transição de tamanho no ícone', () => {
    expect(fonte).not.toMatch(/transition-\[width,height\]/);
  });

  it('o que anima é a largura da coluna', () => {
    expect(fonte).toMatch(/transition-\[width\]/);
  });
});
