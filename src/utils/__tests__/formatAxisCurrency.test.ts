import { formatAxisCurrency } from '../formatters';

describe('formatAxisCurrency', () => {
  it('mantém resolução em escalas pequenas (bug do eixo "R$ 1k, R$ 1k, R$ 0k")', () => {
    // ticks típicos de um dia fraco: 0..2000 — antes colapsavam em 0k/1k/2k
    expect(formatAxisCurrency(0)).toBe('R$ 0');
    expect(formatAxisCurrency(400)).toBe('R$ 400');
    expect(formatAxisCurrency(800)).toBe('R$ 800');
    expect(formatAxisCurrency(1200)).toBe('R$ 1,2k');
    expect(formatAxisCurrency(1600)).toBe('R$ 1,6k');
    expect(formatAxisCurrency(2000)).toBe('R$ 2k');
  });

  it('abrevia sem decimal a partir de 10k', () => {
    expect(formatAxisCurrency(10_000)).toBe('R$ 10k');
    expect(formatAxisCurrency(45_000)).toBe('R$ 45k');
  });

  it('usa M para milhões', () => {
    expect(formatAxisCurrency(1_500_000)).toBe('R$ 1,5M');
  });

  it('rótulos distintos para ticks distintos numa escala apertada', () => {
    const ticks = [0, 500, 1000, 1500, 2000];
    const labels = ticks.map(formatAxisCurrency);
    expect(new Set(labels).size).toBe(ticks.length);
  });
});
