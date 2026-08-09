/**
 * O que a home diz sobre as avaliações da loja.
 *
 * Em 08/ago/2026 a Cê Saladas tinha 4 avaliações com média 5,0 e o dono não
 * via nenhuma: o endpoint existia, a aba de relatório existia, e a home — a
 * tela que ele abre todo dia — não tocava no assunto.
 *
 * DUAS COISAS QUE UMA NOTA MÉDIA SOZINHA NÃO DIZ:
 *
 * 1. Se dá para confiar nela. Média 5,0 com 4 avaliações não é "loja nota 5",
 *    é pouca gente. Anunciar isso como conquista ensina o dono a decidir com
 *    base em ruído.
 *
 * 2. O que consertar. "3,2 de média" não sugere ação nenhuma; "12 pessoas
 *    deram 1 ou 2 estrelas — leia os comentários" sugere.
 */
export interface PilarDeAvaliacao {
  chave: string;
  rotulo: string;
  /** `null` quando ninguém avaliou este pilar — "0,0" leria como péssimo. */
  media: number | null;
  total: number;
}

export interface ResumoDeAvaliacoes {
  summary?: { avg_rating: number | null; count: number };
  distribution?: { rating: number; count: number }[];
  recent?: { rating: number; comment: string; customer_name: string; created_at: string }[];
  by_product?: { product_name: string; avg_rating: number; count: number }[];
  pilares?: PilarDeAvaliacao[];
  /** Chave do pilar com a pior média — o que atacar primeiro. */
  pior_pilar?: string | null;
}

export interface LeituraDeAvaliacoes {
  vazio: boolean;
  /** Já formatada em pt-BR. `null` quando não há nota — "0,0" seria inventar. */
  nota: string | null;
  total: number;
  /** Quantos deram 1 ou 2 estrelas. */
  insatisfeitos: number;
  /** A média já se sustenta em gente suficiente? */
  confiavel: boolean;
  contexto: string;
  recomendacao: string;
  /** Pilares com nota, do pior para o melhor — a ordem já é o diagnóstico. */
  pilares: PilarDeAvaliacao[];
  piorPilar: PilarDeAvaliacao | null;
}

/**
 * Abaixo disto a média é anedota: uma avaliação a mais move o número inteiro.
 * Não é rigor estatístico — é o ponto em que o dono para de decidir por sorte.
 */
const AMOSTRA_CONFIAVEL = 10;

/** Nota abaixo disto pede leitura dos comentários, não comemoração. */
const NOTA_DE_ATENCAO = 4.5;

export function leituraDeAvaliacoes(
  dados: ResumoDeAvaliacoes | undefined | null
): LeituraDeAvaliacoes {
  const total = dados?.summary?.count ?? 0;
  const media = dados?.summary?.avg_rating ?? null;

  // Só os pilares que alguém avaliou, do PIOR para o melhor: a ordem já é o
  // diagnóstico, e o dono lê a primeira linha antes de decidir se lê o resto.
  const pilares = (dados?.pilares ?? [])
    .filter((p) => p.media != null)
    .sort((a, b) => (a.media as number) - (b.media as number));
  const piorPilar = pilares[0] ?? null;

  if (!total || media == null) {
    return {
      vazio: true,
      pilares: [],
      piorPilar: null,
      // `null` e não `0`: "0,0 estrelas" seria uma nota péssima inventada por
      // falta de dado — o oposto da verdade numa loja que ninguém avaliou.
      nota: null,
      total: 0,
      insatisfeitos: 0,
      confiavel: false,
      contexto: 'Ninguém avaliou ainda.',
      recomendacao: 'peça a avaliação no fim da entrega — é quando o cliente ainda está com o gosto na boca',
    };
  }

  // 1 e 2 estrelas. O 3 fica de fora: é morno, não revolta, e somá-lo inflaria
  // o alarme até o dono aprender a ignorar o número.
  const insatisfeitos = (dados?.distribution ?? [])
    .filter((d) => d.rating <= 2)
    .reduce((soma, d) => soma + d.count, 0);

  const confiavel = total >= AMOSTRA_CONFIAVEL;
  const nota = media.toFixed(1).replace('.', ',');

  let contexto: string;
  let recomendacao: string;

  if (!confiavel) {
    contexto = `Ainda são poucas avaliações — cada nova nota move bastante a média.`;
    recomendacao = 'junte mais avaliações antes de tirar conclusão da nota';
  } else if (insatisfeitos > 0 && media < NOTA_DE_ATENCAO) {
    contexto = `${insatisfeitos} ${insatisfeitos === 1 ? 'pessoa deu' : 'pessoas deram'} 1 ou 2 estrelas.`;
    recomendacao = 'leia os comentários dessas notas para entender o que deu errado';
  } else if (insatisfeitos > 0) {
    contexto = `A média está boa, mas ${insatisfeitos} ${insatisfeitos === 1 ? 'cliente saiu' : 'clientes saíram'} insatisfeito.`;
    recomendacao = 'vale ler esses comentários antes que virem padrão';
  } else {
    contexto = 'Nenhuma nota baixa no período.';
    recomendacao = 'peça a avaliação sempre — nota alta com volume é o que convence quem nunca comprou';
  }

  // O pilar mais fraco vira a recomendação quando ele destoa: "sua entrega
  // está em 3,1" diz o que atacar; "sua nota é 4,2" não diz nada.
  if (piorPilar && (piorPilar.media as number) < NOTA_DE_ATENCAO && piorPilar.total >= 3) {
    const nota = (piorPilar.media as number).toFixed(1).replace('.', ',');
    recomendacao = `o ponto fraco é ${piorPilar.rotulo.toLowerCase()} (${nota}) — ataque isso primeiro`;
  }

  return { vazio: false, nota, total, insatisfeitos, confiavel, contexto, recomendacao, pilares, piorPilar };
}

export default leituraDeAvaliacoes;
