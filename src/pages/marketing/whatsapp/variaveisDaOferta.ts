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
import { precoVigenteDoProduto } from '../../../utils/precoVigente';

/**
 * A campanha anuncia o preço que o cliente VAI PAGAR, não o de tabela.
 *
 * Em 04/09 ela saiu com "Tilápia Suprema — R$ 46,99" num dia em que a loja
 * cobrava R$ 31,99. Anunciar caro afasta quem abriria a mensagem pelo preço;
 * anunciar barato e cobrar caro seria pior — é a mesma promessa-na-tela +
 * cobrança-diferente que custou dinheiro no cupom BEMVINDO10.
 *
 * `precoVigenteDoProduto` é o helper canônico (e o único lugar autorizado a
 * ler `price` como fallback, o que a peneira `precoVigente.cobertura` cobra).
 */
export interface ProdutoDaOferta {
  name?: string | null;
  /** Valor de CADASTRO. Não é necessariamente o que a loja cobra hoje. */
  price?: number | string | null;
  /**
   * O que a loja cobra AGORA — o backend já resolveu `promo_price` +
   * `promo_weekday` aqui. É este que a campanha anuncia.
   */
  preco_vigente?: number | string | null;
}


export const precoParaTemplate = (valor?: number | string | null): string => {
  const numero = Number(valor ?? 0);
  const seguro = Number.isFinite(numero) ? numero : 0;
  return `R$ ${seguro.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.replace(/ /g, ' ');
};

export const variaveisDaOferta = (produtos: ProdutoDaOferta[]) => {
  // Produto ausente vira string vazia, não "R$ 0,00": um preço zerado seria
  // lido como oferta de graça pelo cliente.
  const campo = (i: number, chave: 'nome' | 'preco') => {
    const produto = produtos[i];
    if (!produto) return '';
    return chave === 'nome' ? (produto.name || '') : precoParaTemplate(precoVigenteDoProduto(produto as never));
  };

  return {
    produto_1: campo(0, 'nome'),
    preco_1: campo(0, 'preco'),
    produto_2: campo(1, 'nome'),
    preco_2: campo(1, 'preco'),
  };
};
