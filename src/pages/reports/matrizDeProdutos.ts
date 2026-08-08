/**
 * O cardápio em quatro decisões, em vez de um ranking.
 *
 * "Top produtos por receita" responde o que mais vendeu — e só. A pergunta que
 * muda o cardápio é outra: o que fazer com cada item. Um prato que sai muito e
 * fatura pouco não é ruim: é chamariz, e o movimento é subir o combo em volta
 * dele. Um que sai pouco e fatura alto não é fraco: é especialidade, e tirá-lo
 * derruba o ticket médio.
 *
 * Um ranking esconde as duas leituras porque só tem um eixo.
 *
 * POR QUE MEDIANA E NÃO MÉDIA
 *
 * Uma feijoada de R$ 90 no meio de saladas de R$ 30 puxa a média para cima e
 * joga metade de um cardápio saudável para "abaixo da média" — a tela passaria
 * a recomendar cortar itens que vão bem. A mediana ignora o extremo: metade
 * fica de cada lado, por definição.
 */
import type { TopProduct } from '../../services/reports';

export type Quadrante = 'estrela' | 'chamariz' | 'especialidade' | 'peso_morto';

export interface ProdutoClassificado extends TopProduct {
  quadrante: Quadrante;
}

export const QUADRANTES: Record<Quadrante, {
  rotulo: string;
  definicao: string;
  acao: string;
  tom: 'bom' | 'neutro' | 'atencao';
}> = {
  estrela: {
    rotulo: 'Estrelas',
    definicao: 'vendem muito e faturam muito',
    acao: 'proteja: nunca deixe faltar e mantenha em destaque no cardápio',
    tom: 'bom',
  },
  chamariz: {
    rotulo: 'Chamarizes',
    definicao: 'vendem muito, faturam pouco por pedido',
    acao: 'trazem gente para a loja — suba o ticket com combo e adicional',
    tom: 'neutro',
  },
  especialidade: {
    rotulo: 'Especialidades',
    definicao: 'vendem pouco, mas cada pedido vale muito',
    acao: 'não corte por causa do giro — sustentam o ticket médio',
    tom: 'neutro',
  },
  peso_morto: {
    rotulo: 'Peso morto',
    definicao: 'vendem pouco e faturam pouco',
    acao: 'tire do cardápio ou reposicione com foto e descrição novas',
    tom: 'atencao',
  },
};

/**
 * Abaixo disto a mediana não separa nada: com 2 ou 3 produtos, um item cai
 * inevitavelmente em "peso morto" só por ser o menor de três.
 */
const CARDAPIO_MINIMO = 4;

function mediana(valores: number[]): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0
    ? (ordenado[meio - 1] + ordenado[meio]) / 2
    : ordenado[meio];
}

export function matrizDeProdutos(
  produtos: TopProduct[] | null | undefined
): ProdutoClassificado[] {
  if (!produtos || produtos.length < CARDAPIO_MINIMO) return [];

  const corteGiro = mediana(produtos.map((p) => p.total_quantity ?? 0));
  const corteReceita = mediana(produtos.map((p) => p.total_revenue ?? 0));

  return produtos.map((p) => {
    // `>=` nos dois eixos: o item EXATAMENTE na mediana não é fraco, e
    // mandá-lo para "peso morto" faria a tela pedir a remoção de um produto
    // perfeitamente mediano.
    const giraBem = (p.total_quantity ?? 0) >= corteGiro;
    const faturaBem = (p.total_revenue ?? 0) >= corteReceita;

    const quadrante: Quadrante = giraBem
      ? (faturaBem ? 'estrela' : 'chamariz')
      : (faturaBem ? 'especialidade' : 'peso_morto');

    return { ...p, quadrante };
  });
}

export default matrizDeProdutos;
