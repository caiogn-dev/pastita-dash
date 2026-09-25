/**
 * Pagamentos com a identidade única (docs/DESIGN_SYSTEM.md): o
 * PaymentStatusBadge local tinha seis paletas; o do quadro de pedidos, outras
 * quatro — o mesmo "pago" em dois verdes. Agora é SeloDeEstado + estadoDePagamento.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

import { COR_CRUA } from '../../../styles/__tests__/coresCruas.test';

const pagina = readFileSync(join(__dirname, '..', 'PaymentsPage.tsx'), 'utf8');

describe('PaymentsPage — identidade única', () => {
  it('zero cor crua do Tailwind', () => {
    expect(pagina.match(COR_CRUA) ?? []).toEqual([]);
  });

  it('selo de estado do kit com o mapa único de pagamento', () => {
    expect(pagina).not.toMatch(/PaymentStatusBadge/);
    expect(pagina).toContain('SeloDeEstado');
    expect(pagina).toContain('estadoDePagamento');
  });

  it('indicadores pelo KpiGrid, não por cards montados à mão', () => {
    expect(pagina).toContain('KpiGrid');
  });

  it('sem fallback de cor escura escrito à mão nem emoji como ícone', () => {
    expect(pagina).not.toMatch(/--dark-(text|bg)-/);
    expect(pagina).not.toMatch(/💵/);
  });

  it('nada em caixa alta', () => {
    expect(pagina).not.toMatch(/\buppercase\b/);
  });
});
