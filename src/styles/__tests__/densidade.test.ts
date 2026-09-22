/**
 * Densidade: o painel escrevia tudo em 16px.
 *
 * Medição de 21/09 na tela de Cardápio: 262 elementos em 16px/400, contra 41
 * em 13px/500 no painel de referência. Texto grande em tela de operação não é
 * legibilidade, é falta de hierarquia — quando tudo tem o mesmo tamanho, nada
 * tem peso, e cabe menos informação por tela.
 *
 * A correção é no CORPO, não nos componentes: quem escreve `text-base` de
 * propósito continua em 16px; quem não disse nada passa a herdar 14px, que é
 * o `--text-body` que a escala já definia e quase ninguém usava.
 *
 * Título ganha tracking negativo: acima de 20px, a letra "solta" do padrão
 * faz o título parecer esticado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const css = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');

describe('densidade do texto', () => {
  it('o corpo herda o tamanho de corpo da escala, não o 16px do navegador', () => {
    expect(css).toMatch(/\nbody \{[\s\S]*?font-size: var\(--text-body\);/);
  });

  it('título grande tem tracking negativo', () => {
    expect(css).toMatch(/h1, h2, h3 \{\s*letter-spacing:\s*-0\.0[12]em;/);
  });
});
