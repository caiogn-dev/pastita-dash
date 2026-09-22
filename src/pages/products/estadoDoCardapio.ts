/**
 * Qual tela o cardápio deve mostrar agora.
 *
 * Existia 'carregando' e 'falhou', e faltava o caso que mais importa para
 * cliente novo: **zero produtos**. Sem ele, quem acabou de criar a loja cai
 * numa página de indicadores zerados e uma lista vazia, sem nada dizendo o
 * que fazer — justo o momento em que o importador de planilha resolveria a
 * maior fatia das 7,9 h de implantação.
 */

export type EstadoDoCardapio = 'carregando' | 'falhou' | 'vazio' | 'lista';

export function estadoDoCardapio(entrada: {
  temDados: boolean;
  buscando: boolean;
  falhou: boolean;
  quantidade: number;
}): EstadoDoCardapio {
  // Ordem importa: sem dados, "buscando" ganha de "falhou" porque o RETRY põe
  // a query de volta em pending ainda sem dados — sem isto, a tela de erro
  // piscava durante todo o refetch.
  if (!entrada.temDados && entrada.buscando) return 'carregando';
  if (!entrada.temDados && entrada.falhou) return 'falhou';
  // 'vazio' só quando a busca DEU CERTO e veio zero. Cardápio vazio por falha
  // é 'falhou' — dizer "cadastre seu primeiro produto" para quem tem 200
  // produtos e uma consulta caída seria mentira.
  if (entrada.temDados && entrada.quantidade === 0) return 'vazio';
  return 'lista';
}
