/**
 * Foco visível: 462 botões, 35 com anel.
 *
 * Quem navega por teclado — e quem usa leitor de tela — ficava sem saber onde
 * está em 9 de cada 10 controles do painel. Some-se a isso que o navegador
 * desenha o próprio contorno só quando ninguém removeu, e metade dos
 * componentes remove com `focus:outline-none`.
 *
 * A regra base usa `:where(...)`, que tem especificidade ZERO: componente que
 * já define o próprio foco continua mandando. Ninguém precisa editar call
 * site.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const css = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');

describe('foco visível', () => {
  it('existe uma regra base de foco para todo elemento interativo', () => {
    const bloco = css.slice(css.indexOf(':where(button'), css.indexOf(':where(button') + 400);
    expect(bloco).toContain('focus-visible');
    expect(bloco).toContain('outline');
    expect(bloco).toContain('var(--brand)');
  });

  it('a regra cobre link, botão e elemento focável por tabindex', () => {
    const bloco = css.slice(css.indexOf(':where(button'), css.indexOf(':where(button') + 400);
    for (const alvo of ['button', 'a[href]', '[role="button"]', 'tabindex']) {
      expect(bloco).toContain(alvo);
    }
  });

  it('usa :where para não brigar com o foco próprio dos componentes', () => {
    expect(css).toMatch(/:where\(button/);
  });
});
