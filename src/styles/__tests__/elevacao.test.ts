/**
 * Elevação: um sistema só, e que realmente pinta.
 *
 * A tela de Cardápio media 560 elementos com `box-shadow: none` e nenhum com
 * sombra. A causa não era a classe: `shadow-repouso` existe e funciona. Era
 * que os 75 cartões daquela tela eram montados à mão, sem classe de sombra
 * nenhuma (ver superficie.test.ts).
 *
 * No caminho apareceram dois defeitos de verdade:
 *
 * 1. O `tailwind.config.js` tinha DOIS blocos `boxShadow`. Chave repetida em
 *    objeto JS é a última que vale — o primeiro bloco era código morto e
 *    ninguém tinha como notar.
 * 2. A cor padrão de borda do Tailwind é um cinza claro (#e5e7eb), e 91
 *    elementos caíam nela por usar `border` sem classe de cor: borda clara no
 *    tema escuro.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const RAIZ = join(__dirname, '..', '..', '..');
const config = readFileSync(join(RAIZ, 'tailwind.config.js'), 'utf8');
const tokens = readFileSync(join(RAIZ, 'src', 'styles', 'tokens.css'), 'utf8');

describe('elevação e borda', () => {
  it('a cor de borda padrão do Tailwind é a nossa, não o cinza da biblioteca', () => {
    expect(config).toMatch(/borderColor:\s*{[^}]*DEFAULT:\s*'var\(--border\)'/s);
  });

  it('existe UM bloco boxShadow — dois, e o segundo apaga o primeiro', () => {
    expect(config.match(/^\s*boxShadow:\s*{/gm) || []).toHaveLength(1);
  });

  it('os três degraus são os do sistema, e existem em tokens.css', () => {
    for (const nome of ['--elev-repouso', '--elev-hover', '--elev-flutuante']) {
      expect(tokens).toContain(nome);
    }
  });

  it('o tema escuro tem receita própria — sombra clara some no escuro', () => {
    const escuro = tokens.slice(tokens.indexOf('.dark'));
    expect(escuro).toContain('--elev-repouso');
  });

  it('a escala da biblioteca aponta para os mesmos degraus', () => {
    expect(config).toMatch(/'sm':\s*'var\(--elev-repouso\)'/);
    expect(config).toMatch(/'lg':\s*'var\(--elev-hover\)'/);
    expect(config).toMatch(/'2xl':\s*'var\(--elev-flutuante\)'/);
  });
});

describe('sombra fantasma', () => {
  const arquivos = (dir: string, acc: string[] = []): string[] => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) {
        if (nome === 'node_modules') continue;
        arquivos(caminho, acc);
      } else if (/\.(tsx|ts)$/.test(nome) && !/__tests__/.test(caminho)) {
        acc.push(caminho);
      }
    }
    return acc;
  };

  it('nenhum componente pede sombra que o Tailwind não conhece', () => {
    const conhecidas = new Set(
      [...config.matchAll(/^\s*'([a-z0-9-]+)':\s*'[^']*'/gm)].map((m) => `shadow-${m[1]}`)
        .concat(['shadow-none', 'shadow-inner', 'shadow-DEFAULT']),
    );
    const infratores: string[] = [];
    for (const arq of arquivos(join(RAIZ, 'src'))) {
      for (const m of readFileSync(arq, 'utf8').matchAll(/(?:hover:|focus:|group-hover:)?shadow-[a-z0-9-]+/g)) {
        const classe = m[0].replace(/^(hover:|focus:|group-hover:)/, '');
        if (!conhecidas.has(classe)) infratores.push(`${arq.split('/src/')[1]}: ${classe}`);
      }
    }
    expect(infratores).toEqual([]);
  });
});
