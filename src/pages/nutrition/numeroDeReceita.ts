/**
 * Peso de receita como gente escreve.
 *
 * O backend guarda gramas num decimal de 3 casas, então devolve "600.000" e
 * "50.000". Jogar isso no campo faz o operador ler três dígitos que ele nunca
 * digitou e que não significam nada — ninguém pesa 50,000 g de milho.
 *
 * A casa decimal existe para quem precisa dela (sal, fermento, essência), mas
 * só aparece quando o valor realmente tem: 2,5 continua 2,5.
 */
export function paraCampo(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  // Até 3 casas, sem zeros à direita — o mesmo limite do campo no banco.
  return String(Number(numero.toFixed(3)));
}

/** Igual, mas para exibição: vírgula decimal, que é como se lê em português. */
export function paraTexto(valor: unknown): string {
  return paraCampo(valor).replace('.', ',');
}
