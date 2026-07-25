/**
 * EAN-13 interno para etiquetas geradas pelo painel.
 *
 * Códigos com prefixo 2 são reservados pelo GS1 para uso interno de varejo —
 * nunca colidem com EAN de produto industrializado.
 */

/** Dígito verificador EAN-13 a partir dos 12 primeiros dígitos. */
export const ean13CheckDigit = (first12: string): string => {
  if (!/^\d{12}$/.test(first12)) throw new Error('EAN-13 exige 12 dígitos');
  const sum = [...first12].reduce(
    (acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return String((10 - (sum % 10)) % 10);
};

/** True se a string é um EAN-13 completo e com dígito verificador válido. */
export const isValidEan13 = (code: string): boolean =>
  /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === code[12];

/**
 * Gera um EAN-13 interno (prefixo 2) que não colide com os códigos já usados.
 */
export const generateInternalEan13 = (taken: Set<string>): string => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let body = '2';
    for (let i = 0; i < 11; i += 1) body += Math.floor(Math.random() * 10);
    const code = body + ean13CheckDigit(body);
    if (!taken.has(code)) return code;
  }
  throw new Error('Não consegui gerar um código único');
};
