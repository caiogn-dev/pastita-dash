/**
 * Frete grátis promocional — a campanha de "entrega grátis até X km".
 *
 * Vive separada da fórmula de entrega de propósito: a fórmula é o preço
 * permanente da operação, isto é uma promoção que entra e sai. Misturar as
 * duas faria o dono desligar a campanha mexendo no preço de sempre.
 *
 * Chave real no backend: `store.metadata.frete_gratis`
 * (ver `apps/stores/services/frete_promocional.py`).
 */
import { precoParaDistancia, type FormulaDeEntrega } from './precoDaEntrega';

export interface PromoDeFrete {
  ativo: boolean;
  ateKm: number | null;
  pedidoMinimo: number | null;
}

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function lerPromo(metadata: Record<string, unknown>): PromoDeFrete {
  const bruto = (metadata?.frete_gratis ?? {}) as Record<string, unknown>;
  return {
    ativo: Boolean(bruto.ativo),
    ateKm: numeroOuNulo(bruto.ate_km),
    pedidoMinimo: numeroOuNulo(bruto.pedido_minimo),
  };
}

export function gravarPromo(
  metadata: Record<string, unknown>,
  promo: PromoDeFrete,
): Record<string, unknown> {
  // Devolve o metadata INTEIRO: PATCH com metadata parcial apaga o resto
  // (Pixel, Clarity e config fiscal moram no mesmo objeto).
  return {
    ...metadata,
    frete_gratis: {
      ativo: promo.ativo,
      ate_km: promo.ateKm ?? 0,
      // 0 é o jeito do backend dizer "sem mínimo".
      pedido_minimo: promo.pedidoMinimo ?? 0,
    },
  };
}

export function problemasDaPromo(promo: PromoDeFrete, formula: FormulaDeEntrega): string[] {
  if (!promo.ativo) return [];

  const problemas: string[] = [];
  if (!promo.ateKm || promo.ateKm <= 0) {
    problemas.push('Defina até quantos km o frete sai de graça.');
  }
  const raioMaximo = formula.raioMaximoKm;
  if (promo.ateKm && raioMaximo && promo.ateKm > raioMaximo) {
    problemas.push(
      `O raio da promoção (${promo.ateKm} km) passa da área de entrega (${raioMaximo} km).`,
    );
  }
  if (promo.pedidoMinimo !== null && promo.pedidoMinimo < 0) {
    problemas.push('O pedido mínimo não pode ser negativo.');
  }
  return problemas;
}

/** Quanto a loja deixa de cobrar por pedido, na borda do raio. */
export function custoPorPedidoNoRaio(
  formula: FormulaDeEntrega,
  ateKm: number | null,
): number | null {
  if (!ateKm || ateKm <= 0) return null;
  const preco = precoParaDistancia(formula, ateKm);
  return preco.tipo === 'cobrado' ? preco.valor : null;
}

// `toLocaleString` devolve espaço NÃO-QUEBRÁVEL entre "R$" e o número. Ele
// sobrevive a copiar/colar e vaza para comparações e para o texto do template
// de campanha; troco por espaço normal na origem.
export const reais = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');

/** A frase exatamente como o cliente vai ler no cardápio. */
export function textoDaPromo(promo: PromoDeFrete): string {
  if (!promo.ativo || !promo.ateKm) return '';
  const base = `Frete grátis até ${promo.ateKm} km`;
  if (!promo.pedidoMinimo || promo.pedidoMinimo <= 0) return base;
  return `${base} em pedidos acima de ${reais(promo.pedidoMinimo)}`;
}

/** O anel da promoção no mapa. `null` quando não há área para desenhar. */
export interface AnelDaPromo {
  raioMetros: number;
  rotulo: string;
}

/**
 * Traduz a promoção no círculo que o mapa desenha.
 *
 * Devolve `null` — em vez de raio 0 — quando a promoção está desligada ou sem
 * km: um círculo de raio zero vira um PONTO exatamente em cima do pin da loja,
 * e o dono lê isso como "frete grátis em lugar nenhum".
 */
export function anelDaPromo(promo: PromoDeFrete): AnelDaPromo | null {
  if (!promo.ativo || !promo.ateKm || promo.ateKm <= 0) return null;
  return {
    // Raio quebrado (2,5 km) é comum; arredondo em metros para não passar
    // float sujo ao Google.
    raioMetros: Math.round(promo.ateKm * 1000),
    rotulo: textoDaPromo(promo),
  };
}
