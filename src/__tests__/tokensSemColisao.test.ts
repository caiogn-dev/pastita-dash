import * as fs from 'fs';
import * as path from 'path';

/**
 * tokens.css é a ÚNICA fonte de verdade das variáveis do design system.
 *
 * Regressão (PD-UIUX-005): index.css importa tokens.css na linha 1 e depois
 * redeclarava `--fg-muted` com a mesma especificidade (`:root` e `.dark`), com
 * valores de outra paleta. A regra posterior vence, então o token da marca
 * morria em silêncio — nada quebra, o build passa, e a única evidência é o
 * contraste caindo.
 *
 * O estrago era grande porque o tailwind.config mapeia `text-fg-muted` E
 * `text-fg-muted-token` para a mesma variável: 1.139 ocorrências em 86 arquivos
 * caíram para 2,99:1 (dark) e 2,54:1 (light), contra o mínimo AA de 4,5:1. Some
 * a navegação do PWA e a legenda do KDS na tela da cozinha.
 *
 * Este teste falha se alguém reintroduzir a colisão. Precisando de outro tom,
 * use OUTRO nome (--fg-subtle), não o mesmo.
 */
const STYLES = path.join(__dirname, '..', 'styles');
const SRC = path.join(__dirname, '..');

/** Nomes de variável declarados dentro de tokens.css. */
function tokensDeclarados(): Set<string> {
  const css = fs.readFileSync(path.join(STYLES, 'tokens.css'), 'utf8');
  return new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));
}

/** Variáveis declaradas num arquivo, ignorando comentários. */
function declaradasEm(arquivo: string): string[] {
  const css = fs.readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]);
}

describe('design tokens — sem colisão de nome fora do tokens.css', () => {
  it('index.css não redeclara nenhuma variável definida em tokens.css', () => {
    const doTokens = tokensDeclarados();
    expect(doTokens.size).toBeGreaterThan(10); // sanidade: o parse achou algo

    const colisoes = [...new Set(declaradasEm(path.join(SRC, 'index.css')))]
      .filter((nome) => doTokens.has(nome))
      .sort();

    expect(colisoes).toEqual([]);
  });

  it('--fg-muted vem só de tokens.css', () => {
    const doIndex = declaradasEm(path.join(SRC, 'index.css'));
    expect(doIndex).not.toContain('--fg-muted');
  });
});
