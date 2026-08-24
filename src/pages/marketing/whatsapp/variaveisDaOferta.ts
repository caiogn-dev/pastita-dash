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
export interface ProdutoDaOferta {
  name?: string | null;
  price?: number | string | null;
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
    return chave === 'nome' ? (produto.name || '') : precoParaTemplate(produto.price);
  };

  return {
    produto_1: campo(0, 'nome'),
    preco_1: campo(0, 'preco'),
    produto_2: campo(1, 'nome'),
    preco_2: campo(1, 'preco'),
  };
};
