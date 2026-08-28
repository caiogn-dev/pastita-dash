/**
 * Variáveis da oferta enviadas no template de campanha.
 *
 * O painel preenche exatamente `produto_1/preco_1/produto_2/preco_2` (mais
 * `nome_cliente`); qualquer outro nome no template chega vazio e o envio falha
 * na Meta.
 *
 * O preço sai COM "R$". Quem cria o template no WhatsApp Manager não tem como
 * adivinhar o formato que o painel manda — deixar o símbolo por conta do corpo
 * do template foi o que fez `ce_saladas_oferta_do_dia` ser aprovado dizendo
 * "Salmão Sublime — 52,90".
 */
import { precoVigenteDoProduto, ComPrecoVigente } from '../../../utils/precoVigente';

export interface ProdutoDaOferta {
  name?: string | null;
  /**
   * O preço JÁ RESOLVIDO (vigente), não o `price` de cadastro. Use
   * `produtosParaOferta` para montar este objeto a partir do produto cru — a
   * oferta enviada ao cliente não pode sair com o preço cheio num produto em
   * promoção do dia.
   */
  price?: number | string | null;
}

export const precoParaTemplate = (valor?: number | string | null): string => {
  const numero = Number(valor ?? 0);
  const seguro = Number.isFinite(numero) ? numero : 0;
  return `R$ ${seguro.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.replace(/\u00A0/g, ' ');
};

export const variaveisDaOferta = (produtos: ProdutoDaOferta[]) => {
  // Produto ausente vira string vazia, não "R$ 0,00": um preço zerado seria
  // lido como oferta de graça pelo cliente.
  const campo = (i: number, chave: 'nome' | 'preco') => {
    const produto = produtos[i];
    if (!produto) return '';
    return chave === 'nome' ? (produto.name || '') : precoParaTemplate(produto.price);
  };

  return {
    produto_1: campo(0, 'nome'),
    preco_1: campo(0, 'preco'),
    produto_2: campo(1, 'nome'),
    preco_2: campo(1, 'preco'),
  };
};

/**
 * Converte os produtos escolhidos em objetos de oferta com o preço VIGENTE já
 * resolvido (promo do dia da semana), o mesmo valor que vai no payload e no
 * resumo da campanha. Sem isso, a oferta enviada ao cliente sai com o `price`
 * de cadastro cheio num produto em promoção — divergindo do que ele vê no
 * cardápio e do que o painel mostra na prévia.
 */
export const produtosParaOferta = (
  produtos: Array<ComPrecoVigente & { name?: string | null }>,
): ProdutoDaOferta[] =>
  produtos.map((produto) => ({
    name: produto.name ?? '',
    price: precoVigenteDoProduto(produto),
  }));
