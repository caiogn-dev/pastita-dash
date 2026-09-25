/**
 * A tela de fidelidade só usa as cores do tema.
 *
 * O dono pediu identidade, e a identidade do painel mora nos tokens
 * (`text-fg-token`, `bg-surface`, `bg-brand`…): eles viram de tom sozinhos no
 * escuro e mantêm o dourado da marca. Uma cor crua do Tailwind (`bg-amber-400`,
 * `text-white`) fura o tema e volta a pintar a tela "de outro produto".
 *
 * Também não há rótulo em caixa alta: título de seção nesta tela é frase.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..', '..');
const ARQUIVOS = [
  'pages/loyalty/FidelidadePage.tsx',
  'pages/loyalty/CashbackSection.tsx',
  'pages/loyalty/IndicacoesCard.tsx',
  'components/loyalty/CartaoDeFidelidadePreview.tsx',
  'components/loyalty/SecaoDoPrograma.tsx',
];

const PALETA =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COR_CRUA = new RegExp(
  `\\b(bg|text|border|ring|from|via|to|fill|stroke|accent|divide|outline|decoration|placeholder)-(?:(?:${PALETA})-\\d{2,3}|white|black)\\b`,
);
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/** Comentário não pinta nada — só o código conta. */
const ehComentario = (linha: string) => /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(linha);

const infratores = (teste: (linha: string) => boolean) => {
  const achados: string[] = [];
  for (const arq of ARQUIVOS) {
    readFileSync(join(SRC, arq), 'utf8').split('\n').forEach((linha, i) => {
      if (!ehComentario(linha) && teste(linha)) achados.push(`${arq}:${i + 1}: ${linha.trim()}`);
    });
  }
  return achados;
};

describe('fidelidade — cores do tema', () => {
  it('nenhuma cor crua do Tailwind', () => {
    expect(infratores((l) => COR_CRUA.test(l))).toEqual([]);
  });

  it('nenhuma cor em hexadecimal', () => {
    expect(infratores((l) => HEX.test(l))).toEqual([]);
  });

  it('nenhum rótulo em caixa alta', () => {
    expect(infratores((l) => /\buppercase\b|\boverline\b|tracking-widest/.test(l))).toEqual([]);
  });
});
