/**
 * Botão só com ícone precisa dizer o que faz.
 *
 * Oito botões do painel eram só um desenho: lupa, X, lixeira, avião de papel.
 * Quem usa leitor de tela ouvia "botão" e nada mais — e quem enxerga também
 * ficava no chute quando o ícone era ambíguo (avião de papel é "enviar" ou
 * "usar modelo"?).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..');

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      arquivos(caminho, acc);
    } else if (/\.tsx$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

describe('acessibilidade dos botões de ícone', () => {
  it('nenhum botão é só um desenho', () => {
    const mudos: string[] = [];
    for (const arq of arquivos(SRC)) {
      const fonte = readFileSync(arq, 'utf8');
      for (const m of fonte.matchAll(/<button\b([^>]*)>([\s\S]{0,180}?)<\/button>/g)) {
        const [, attrs, corpo] = m;
        if (/aria-label|aria-labelledby|title=/.test(attrs)) continue;
        if (corpo.replace(/<[^>]+>/g, '').trim()) continue;
        if (/<[A-Z]\w*Icon|<(Star|Trash|Pencil|Plus|X|Search|Check)\b/.test(corpo)) {
          mudos.push(`${arq.split('/src/')[1]}:${fonte.slice(0, m.index).split('\n').length}`);
        }
      }
    }
    expect(mudos).toEqual([]);
  });
});
