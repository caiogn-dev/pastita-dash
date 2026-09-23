/**
 * Qual tela uma lista deve mostrar agora — a decisão em um lugar só.
 *
 * Toda tela de lista precisa escolher entre quatro telas, e a escolha tem uma
 * armadilha: **vazio enganoso**. Quando a busca falha, a lista fica em `[]` e a
 * tabela mostra "Nenhum cliente cadastrado" — um vazio confiante, que diz ao
 * lojista que ninguém comprou quando na verdade a conexão caiu.
 *
 * Isto já estava escrito à mão em cinco telas (Cardápio, Clientes, Sessões,
 * Agendadas, Direct), cada uma com a sua cópia da regra e do comentário. Cópia
 * número seis é questão de tempo: a próxima tela erra a ordem e o vazio
 * enganoso volta. A regra mora aqui.
 *
 *     const estado = estadoDaLista({
 *       temDados: query.data !== undefined,
 *       buscando: query.isFetching,
 *       falhou: query.isError,
 *       quantidade: lista.length,
 *     });
 */

export type EstadoDaLista = 'carregando' | 'falhou' | 'vazio' | 'lista';

export interface EntradaDaLista {
  /** A busca já devolveu alguma coisa alguma vez (inclusive lista vazia). */
  temDados: boolean;
  /** Há requisição em voo agora. */
  buscando: boolean;
  /** A última requisição terminou em erro. */
  falhou: boolean;
  /** Quantos itens a tela tem para mostrar. */
  quantidade: number;
}

export function estadoDaLista(entrada: EntradaDaLista): EstadoDaLista {
  // Ordem importa: sem dados, "buscando" ganha de "falhou", porque o RETRY põe
  // a consulta de volta em pending ainda sem dados — sem isto, a tela de erro
  // piscava durante todo o refetch.
  if (!entrada.temDados && entrada.buscando) return 'carregando';
  if (!entrada.temDados && entrada.falhou) return 'falhou';
  // 'vazio' só quando a busca DEU CERTO e veio zero. Lista vazia por falha é
  // 'falhou' — dizer "cadastre seu primeiro produto" para quem tem 200
  // produtos e uma consulta caída seria mentira.
  if (entrada.temDados && entrada.quantidade === 0) return 'vazio';
  // Dado em cache manda: com itens na tela, uma falha de refetch não apaga o
  // que o lojista já está lendo.
  return 'lista';
}
