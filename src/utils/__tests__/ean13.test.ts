import { ean13CheckDigit, isValidEan13, generateInternalEan13 } from '../ean13';

describe('ean13', () => {
  it('calcula o dígito verificador (vetor conhecido)', () => {
    // 4006381333931 é um EAN-13 real e válido
    expect(ean13CheckDigit('400638133393')).toBe('1');
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
  });

  it('gera código interno com prefixo 2, 13 dígitos e verificador válido', () => {
    const code = generateInternalEan13(new Set());
    expect(code).toMatch(/^2\d{12}$/);
    expect(isValidEan13(code)).toBe(true);
  });

  it('evita colisão com códigos já usados', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const code = generateInternalEan13(seen);
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });
});
