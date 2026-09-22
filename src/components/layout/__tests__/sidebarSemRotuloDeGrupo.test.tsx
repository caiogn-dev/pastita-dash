/**
 * A coluna não escreve o nome da categoria, e recolhida ela FICA recolhida.
 *
 * Duas decisões do dono (21/09):
 *
 * 1. Os rótulos "OPERAÇÃO", "CATÁLOGO", "CRESCIMENTO" eram texto que não é
 *    destino: ocupavam quatro linhas e ninguém clica neles. O traço fino
 *    separa igual, sem ler.
 *
 * 2. Clicar num grupo com a coluna recolhida ABRIA a coluna inteira — a
 *    página inteira pulava 184px por um clique que pedia só para ver um
 *    submenu. Agora o submenu aparece por cima (a espiada que o hover já
 *    fazia) e a largura não muda.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const fonte = readFileSync(join(__dirname, '..', 'Sidebar.tsx'), 'utf8');

describe('coluna sem rótulo de categoria', () => {
  it('o nome do grupo não é renderizado', () => {
    expect(fonte).not.toMatch(/\{secao\.grupo\}/);
  });

  it('a separação continua existindo, como traço', () => {
    expect(fonte).toMatch(/h-px w-6 bg-border-token/);
  });

  it('clicar num grupo recolhido não muda a preferência de largura', () => {
    // O ramo do clique com a coluna recolhida: mostra o submenu por cima
    // (espiada) e NÃO reescreve a preferência de largura.
    const inicio = fonte.indexOf('if (recolhido) {');
    const ramo = fonte.slice(inicio, fonte.indexOf('}', fonte.indexOf('setAberto(secao.label);', inicio)));
    expect(ramo).not.toMatch(/mudarPreferencia/);
    expect(ramo).toMatch(/setEspiando\(true\)/);
    // E alterna: sem isto o submenu desce e não volta.
    expect(ramo).toMatch(/if \(estaAberta\)/);
  });
});
