/**
 * Variáveis da oferta enviadas no template da campanha.
 *
 * O painel preenche `produto_1/preco_1/produto_2/preco_2`; qualquer outro nome
 * no template chega vazio e o envio falha na Meta.
 *
 * O preço tem que ser o VIGENTE do dia (`preco_vigente`), não o de CADASTRO
 * (`price`). A mensagem vai POR ESCRITO ao cliente: prometer um desconto que o
 * balcão não honra é o erro que ele percebe na frente do caixa. O resto da tela
 * (seleção, revisão e o `offer_products` salvo) já lê o preço do dia com
 * `precoVigenteDoProduto`; só o texto enviado lia o valor cheio.
 *
 * O formato do número (`32,90`, sem "R$") é o mesmo que o painel já mandava: o
 * símbolo da moeda mora no corpo do template aprovado na Meta, não na variável.
 * Aqui mora a aritmética; no componente fica só o desenho.
 */
import type { StoreProduct } from '../../../services/storesApi';
import { precoVigenteDoProduto } from '../../../utils/precoVigente';

/** Preço do dia do produto formatado em pt-BR (duas casas, sem símbolo). */
export const precoDaOferta = (produto?: StoreProduct | null): string =>
  precoVigenteDoProduto(produto).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const buildOfferVariables = (offerProducts: StoreProduct[]) => ({
  produto_1: offerProducts[0]?.name || '',
  preco_1: precoDaOferta(offerProducts[0]),
  produto_2: offerProducts[1]?.name || '',
  preco_2: precoDaOferta(offerProducts[1]),
});
