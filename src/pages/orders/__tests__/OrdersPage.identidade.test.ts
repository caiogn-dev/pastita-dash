/**
 * O quadro de pedidos com a identidade única (docs/DESIGN_SYSTEM.md).
 *
 * Teste de string, de propósito: a página tem DnD + WebSocket + cinco hooks, e
 * o que se trava aqui é só a apresentação — zero cor crua, nenhum selo local,
 * nada em caixa alta. A lógica de dados tem os próprios testes ao lado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

import { COR_CRUA } from '../../../styles/__tests__/coresCruas.test';

const pagina = readFileSync(join(__dirname, '..', 'OrdersPage.tsx'), 'utf8');
const colunas = readFileSync(join(__dirname, '..', 'orderColumns.ts'), 'utf8');

describe('OrdersPage — identidade única', () => {
  it('zero cor crua do Tailwind na página', () => {
    expect(pagina.match(COR_CRUA) ?? []).toEqual([]);
  });

  it('as colunas do quadro não carregam paleta própria', () => {
    expect(colunas.match(COR_CRUA) ?? []).toEqual([]);
    expect(colunas).not.toMatch(/headerBg|colBg|dotColor|borderTop/);
  });

  it('o selo de pagamento é o do kit, com o mapa único', () => {
    expect(pagina).not.toMatch(/PAYMENT_CONFIGS|const PaymentBadge/);
    expect(pagina).toContain('SeloDeEstado');
    expect(pagina).toContain('estadoDePagamento');
  });

  it('o tom da coluna e do prazo vêm de estados.ts', () => {
    expect(pagina).toContain('estadoDePedido');
    expect(pagina).toContain('tomDoPrazo');
  });

  it('nada em caixa alta, sem branco fixo, sem gradiente', () => {
    expect(pagina).not.toMatch(/\buppercase\b/);
    expect(pagina).not.toMatch(/ATRASADO/);
    expect(pagina).not.toMatch(/\btext-white\b|\bbg-white\b/);
    expect(pagina).not.toMatch(/bg-gradient|\bfrom-|\bvia-/);
  });

  it('não usa a cor do botão que a máquina de estados ainda devolve', () => {
    expect(pagina).not.toMatch(/acao\.cor|action\.color/);
  });

  it('as colunas usam a superfície do sistema', () => {
    expect(pagina).toContain('superficie');
  });
});
