/**
 * Tema claro, 20/10. O dono: "a UI branca do painel não está legal".
 *
 * Medido na produção:
 *  - todo rótulo de seção (`.overline`, 26 telas + todo StatCard) saía com um
 *    TRAÇO EM CIMA — o Tailwind tem um utilitário `overline`
 *    (text-decoration: overline) com o mesmo nome da nossa classe;
 *  - o ouro claro como tinta de botão lia como mostarda apagada;
 *  - texto marrom e cromo creme sobre fundo cinza neutro: dois climas na
 *    mesma tela, e um gradiente bege no canto que lia como sujeira.
 *
 * No claro o botão principal é carvão com texto branco; o ouro fica como
 * acento (texto --brand-ink, fundo --brand-soft). O escuro não muda.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const RAIZ = join(__dirname, '..', '..', '..');
const tokens = readFileSync(join(RAIZ, 'src', 'styles', 'tokens.css'), 'utf8');
const claro = tokens.slice(tokens.indexOf(':root {'), tokens.indexOf('.dark {'));
const tailwind = readFileSync(join(RAIZ, 'tailwind.config.js'), 'utf8');

const valor = (nome: string) => {
  const achado = claro.match(new RegExp(`--${nome}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!achado) throw new Error(`--${nome} sem hex no tema claro`);
  return achado[1];
};

const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Diferença entre o canal mais alto e o mais baixo: 0 = cinza puro. */
const saturacao = (hex: string) => {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(...canais) - Math.min(...canais);
};

describe('tema claro', () => {
  it('o utilitário `overline` do Tailwind não existe (rótulo sem traço)', () => {
    expect(tailwind).toMatch(/blocklist:\s*\[[^\]]*'overline'/);
  });

  it('botão principal legível: texto sobre a tinta passa 4,5:1', () => {
    expect(contraste(valor('brand'), valor('on-brand'))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(valor('brand-hover'), valor('on-brand'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['canvas', 'surface', 'surface-2', 'border', 'chrome-bg', 'chrome-bg-to', 'chrome-border'])(
    '--%s é neutro (sem bege)',
    (nome) => {
      expect(saturacao(valor(nome))).toBeLessThanOrEqual(6);
    },
  );

  it.each(['surface', 'surface-2', 'canvas'])('texto secundário passa 4,5:1 sobre --%s', (fundo) => {
    expect(contraste(valor('fg-muted'), valor(fundo))).toBeGreaterThanOrEqual(4.5);
  });

  it('borda de campo passa 3:1 sobre a superfície', () => {
    expect(contraste(valor('border-input'), valor('surface'))).toBeGreaterThanOrEqual(3);
  });
});
