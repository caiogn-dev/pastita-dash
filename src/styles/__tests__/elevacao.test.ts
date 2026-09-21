/**
 * Elevação: o painel era 100% chapado.
 *
 * Medição de 21/09 na tela de Cardápio em produção: 560 elementos com
 * `box-shadow: none` e NENHUM com sombra. Sem elevação, card, fundo e
 * cabeçalho viram a mesma superfície — a tela parece um formulário, não um
 * produto. O painel que o dono usa como referência tem duas sombras discretas
 * (cartão `0 1px 2px rgba(16,24,40,.04)`, chip `0 1px 1px .03`) e uma maior só
 * para modal.
 *
 * E a borda: 91 elementos usavam o CINZA PADRÃO do Tailwind (#e5e7eb) porque
 * `border` sem classe de cor cai no default da biblioteca — borda clara no
 * tema escuro. A cor padrão passa a ser a nossa.
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

  it('existem os três degraus de elevação em tokens.css', () => {
    for (const nome of ['--elev-1', '--elev-2', '--elev-modal']) {
      expect(tokens).toContain(nome);
    }
  });

  it('o tema escuro redefine a elevação — sombra clara some no escuro', () => {
    const escuro = tokens.slice(tokens.indexOf('.dark'));
    expect(escuro).toContain('--elev-1');
  });

  it('o Tailwind expõe a elevação como classe', () => {
    expect(config).toMatch(/boxShadow:\s*{[^}]*'e1':\s*'var\(--elev-1\)'/s);
    expect(config).toMatch(/'e2':\s*'var\(--elev-2\)'/);
    expect(config).toMatch(/'modal':\s*'var\(--elev-modal\)'/);
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

  const PERMITIDAS = new Set([
    'shadow-e1', 'shadow-e2', 'shadow-modal',
    'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    'shadow-none', 'shadow-inner',
  ]);

  it('nenhum componente pede sombra que o Tailwind não conhece', () => {
    // `shadow-repouso` e `shadow-hover` existiam no Card e não existiam no
    // Tailwind: a classe ia para o HTML e não pintava nada. Foi por isso que o
    // painel inteiro ficou chapado sem ninguém ver o erro.
    const infratores: string[] = [];
    for (const arq of arquivos(join(__dirname, '..', '..'))) {
      const fonte = readFileSync(arq, 'utf8');
      for (const m of fonte.matchAll(/(?:hover:|focus:|group-hover:)?shadow-[a-z0-9-]+/g)) {
        const classe = m[0].replace(/^(hover:|focus:|group-hover:)/, '');
        if (!PERMITIDAS.has(classe)) infratores.push(`${arq.split('/src/')[1]}: ${classe}`);
      }
    }
    expect(infratores).toEqual([]);
  });

  it('a escala do Tailwind aponta para os tokens — sombra clara não some no escuro', () => {
    expect(config).toMatch(/'sm':\s*'var\(--elev-1\)'/);
    expect(config).toMatch(/'lg':\s*'var\(--elev-2\)'/);
    expect(config).toMatch(/'2xl':\s*'var\(--elev-modal\)'/);
  });
});
