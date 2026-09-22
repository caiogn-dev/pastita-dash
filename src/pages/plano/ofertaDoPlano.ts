/**
 * A oferta de um plano, em linguagem de dono de restaurante.
 *
 * O backend manda os números prontos (`adesao_no_mensal`, `adesao_no_anual`,
 * `economia_no_anual`) de propósito: quando a tela montava o preço sozinha,
 * este repo chegou a ter TRÊS fontes de preço discordando ao mesmo tempo
 * (11/ago — R$ 329 no código, R$ 249 no documento e nas mensagens).
 *
 * Aqui não se calcula preço. Só se escolhe a palavra.
 */

export type Ciclo = 'monthly' | 'annual';

export interface PlanoComOferta {
  key: string;
  name: string;
  monthly_price: number;
  annual_price?: number;
  adesao_no_mensal?: number;
  adesao_no_anual?: number;
  economia_no_anual?: number;
}

export interface Oferta {
  /** O número grande. No anual é a mensalidade equivalente, não o total. */
  valorPorMes: number;
  /** O que o lojista paga HOJE para começar. */
  primeiroPagamento: number;
  /** Explica o primeiro pagamento sem o dono ter que fazer conta. */
  explicacao: string;
  /** Selo do que o compromisso comprou. Vazio quando não comprou nada. */
  selo: string;
  economia: number;
}

const reais = (v: number) =>
  `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export function formatarReais(v: number): string {
  return reais(v);
}

/**
 * MESES_DO_ANO é 12 e MESES_COBRADOS é 10 — mas nenhum dos dois é decidido
 * aqui. O `annual_price` já vem do backend; dividir por 12 só responde "quanto
 * dá por mês", que é como o dono compara com a mensalidade.
 */
const MESES_DO_ANO = 12;

export function ofertaDoPlano(plano: PlanoComOferta, ciclo: Ciclo): Oferta {
  const adesaoMensal = plano.adesao_no_mensal ?? 0;
  const economia = plano.economia_no_anual ?? 0;

  if (ciclo === 'annual' && plano.annual_price) {
    return {
      valorPorMes: plano.annual_price / MESES_DO_ANO,
      primeiroPagamento: plano.annual_price,
      explicacao: `${reais(plano.annual_price)} uma vez, no PIX. Cobre o ano inteiro.`,
      // O selo só existe se havia adesão para isentar. Dizer "implantação
      // grátis" num plano que nunca cobrou implantação é promessa vazia.
      selo: adesaoMensal > 0 ? 'Implantação inclusa' : '',
      economia,
    };
  }

  return {
    valorPorMes: plano.monthly_price,
    primeiroPagamento: plano.monthly_price + adesaoMensal,
    explicacao:
      adesaoMensal > 0
        ? `${reais(adesaoMensal)} de implantação + ${reais(plano.monthly_price)} do primeiro mês.`
        : `${reais(plano.monthly_price)} por mês.`,
    selo: '',
    economia,
  };
}

/**
 * A âncora: o que a mesma loja pagaria de comissão num marketplace.
 *
 * A estratégia é explícita — apresentar o preço DEPOIS da conta, nunca antes.
 * Uma loja de 200 pedidos a R$ 45 fatura R$ 9.000; o plano Entrega do iFood
 * leva 26,5% disso. R$ 249 é 2,8% do mesmo número.
 */
export const COMISSAO_DO_MARKETPLACE = 0.265;

export function quantoOMarketplaceLevaria(faturamentoMensal: number): number {
  return faturamentoMensal * COMISSAO_DO_MARKETPLACE;
}
