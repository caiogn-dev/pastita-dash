/**
 * Clientes tinha 32 cores cruas — quase todas num mapa local de status de
 * pedido com seis paletas (amarelo, azul, laranja, índigo, esmeralda,
 * vermelho) —, um <textarea> e um checkbox crus, e títulos em caixa alta na
 * ficha. Regra de `docs/DESIGN_SYSTEM.md`: só tokens do tema, estado vem de
 * `estados.ts`, controles do kit.
 *
 * Fora da regra de preto e branco: o avatar tem fundo dinâmico (paleta de
 * ouro da marca, `utils/avatar`) e o texto branco sobre ele é proposital.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const ARQUIVO = 'pages/customers/CustomersPage.tsx';
const fonte = readFileSync(join(__dirname, '..', '..', '..', ARQUIVO), 'utf8');

const PALETA =
  'red|green|blue|yellow|amber|orange|gray|slate|zinc|neutral|stone|emerald|rose|indigo|purple|violet|teal|cyan|sky|lime|pink|fuchsia';

const infratores = (regra: RegExp) =>
  fonte
    .split('\n')
    .map((linha, i) => ({ linha, i }))
    .filter(({ linha }) => regra.test(linha))
    .map(({ i, linha }) => `${ARQUIVO}:${i + 1}  ${linha.trim()}`);

describe('Clientes — identidade única', () => {
  it('zero cor crua do Tailwind', () => {
    expect(
      infratores(
        new RegExp(
          `\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|accent|outline)-(${PALETA})-\\d{2,3}\\b`,
        ),
      ),
    ).toEqual([]);
  });

  it('nenhum hex escrito numa classe', () => {
    expect(infratores(/\[[^\]]*#[0-9a-fA-F]{3,8}[^\]]*\]/)).toEqual([]);
  });

  it('nenhuma variante dark: à mão — o token já vira sozinho', () => {
    expect(infratores(/\bdark:/)).toEqual([]);
  });

  it('nada em caixa alta (uppercase, .overline)', () => {
    expect(infratores(/\buppercase\b|["'\s]overline\b/)).toEqual([]);
  });

  it('nenhum controle cru (select, input, textarea)', () => {
    expect(infratores(/<(select|input|textarea)\b/)).toEqual([]);
  });

  it('estado de pedido, de cliente e segmento vêm de estados.ts', () => {
    expect(fonte).not.toMatch(/const STATUS_COLOR|const STATUS_LABEL|const SEGMENTO_NA_FICHA/);
    expect(fonte).toMatch(/estadoDePedido/);
    expect(fonte).toMatch(/estadoDeCliente/);
    expect(fonte).toMatch(/estadoDeSegmento/);
    expect(fonte).toMatch(/<SeloDeEstado\b/);
  });
});
