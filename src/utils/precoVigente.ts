/**
 * O preço que o cliente paga HOJE.
 *
 * `price` é o valor de CADASTRO. A promoção que se repete por dia da semana
 * ("quinta do especial") vive em `promo_price` + `promo_weekday`, e o backend
 * já resolve a regra e entrega pronto em `preco_vigente`.
 *
 * Quem MOSTRA ou COBRA preço tem que ler daqui. O storefront já foi corrigido;
 * o PDV continuava lendo `price` direto — mostrava R$ 39,99 num produto em
 * promoção a R$ 32,99 e, pior, somava o total com o valor cheio. Vender no
 * balcão mais caro do que no cardápio é o tipo de erro que o cliente percebe
 * na frente do caixa.
 */
export interface ComPrecoVigente {
  price: number | string;
  preco_vigente?: number | string | null;
}

export const precoVigenteDoProduto = (produto: ComPrecoVigente | null | undefined): number => {
  if (!produto) return 0;
  const vigente = produto.preco_vigente;
  if (vigente !== undefined && vigente !== null && vigente !== '') return Number(vigente);
  return Number(produto.price ?? 0);
};
