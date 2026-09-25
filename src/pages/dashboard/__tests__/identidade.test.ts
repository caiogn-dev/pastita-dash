/**
 * A home é a primeira tela que o dono vê — e era a que mais fugia da
 * identidade: 44 cores cruas (pipeline em cinco cores, banner de erro em
 * vermelho do Tailwind, amarelo/laranja/esmeralda na saúde do sistema), cada
 * uma com o seu par `dark:` à mão, e rótulos em caixa alta.
 *
 * Regra de `docs/DESIGN_SYSTEM.md`: só tokens do tema, estado vem de
 * `estados.ts`, blocos são `Secao`, sem caixa alta, sem gradiente.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const ARQUIVO = 'pages/dashboard/DashboardPage.tsx';
const fonte = readFileSync(join(__dirname, '..', '..', '..', ARQUIVO), 'utf8');

const PALETA =
  'red|green|blue|yellow|amber|orange|gray|slate|zinc|neutral|stone|emerald|rose|indigo|purple|violet|teal|cyan|sky|lime|pink|fuchsia';

const infratores = (regra: RegExp) =>
  fonte
    .split('\n')
    .map((linha, i) => ({ linha, i }))
    .filter(({ linha }) => regra.test(linha))
    .map(({ i, linha }) => `${ARQUIVO}:${i + 1}  ${linha.trim()}`);

describe('Dashboard — identidade única', () => {
  it('zero cor crua do Tailwind', () => {
    expect(
      infratores(
        new RegExp(
          `\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|accent|outline)-(${PALETA})-\\d{2,3}\\b`,
        ),
      ),
    ).toEqual([]);
  });

  it('nenhum text-white / bg-black — não viram de tom com o tema', () => {
    expect(infratores(/\b(bg|text|border)-(white|black)\b/)).toEqual([]);
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

  it('nada de gradiente', () => {
    expect(infratores(/\bbg-gradient|linear-gradient/)).toEqual([]);
  });

  it('nenhum controle cru nem botão montado à mão', () => {
    expect(infratores(/<(select|input|textarea|button)\b/)).toEqual([]);
  });

  it('estado de pedido e de saúde vêm de estados.ts, não de mapa local', () => {
    expect(fonte).not.toMatch(/const STATUS_BADGE|const healthVariant|const healthLabel/);
    expect(fonte).toMatch(/estadoDePedido/);
    expect(fonte).toMatch(/estadoDeSaude/);
  });

  it('os blocos são Secao', () => {
    expect((fonte.match(/<Secao\b/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
