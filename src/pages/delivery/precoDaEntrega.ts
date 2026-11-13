/**
 * A matemática da taxa de entrega — espelho do backend.
 *
 * O preço vinha de DOIS lugares no painel: `StoreSettingsPage` gravava a
 * fórmula em `metadata` e `DeliveryZonesPage` mantinha 16 faixas de 1 km no
 * banco. As zonas tinham precedência, então a fórmula que o dono editava não
 * valia nada — duas telas discordando sobre o mesmo número, e a que parecia
 * certa era a ignorada.
 *
 * Agora a fórmula é a fonte, e este arquivo é a única cópia dela no frontend.
 * Ele existe para a PRÉVIA: o dono precisa ver o preço em 2, 5, 10 e 15 km
 * enquanto digita, e não vamos pedir uma requisição por tecla.
 *
 * ⚠️ Espelha `DeliveryQuoteService.calculate_dynamic_fee` (server2). Mudou lá,
 * muda aqui — os testes deste arquivo travam os mesmos casos dos testes do
 * backend em `test_taxa_por_faixa_de_km.py`.
 */

export interface FormulaDeEntrega {
  /** Taxa cobrada dentro do raio plano. */
  taxaBase: number;
  /** Até esta distância a taxa é só a base. */
  raioPlanoKm: number;
  /** Preço de cada km além do raio plano. */
  porKm: number;
  /** A partir daqui o km fica mais caro. Vazio = sem segundo degrau. */
  encareceEmKm?: number | null;
  /** Preço do km depois de `encareceEmKm`. */
  porKmLonge?: number | null;
  /** Acima disso a loja não entrega. */
  raioMaximoKm: number;
  /** Teto opcional: a taxa nunca passa disso. */
  taxaMaxima?: number | null;
}

export type ResultadoDoPreco =
  | { tipo: 'cobrado'; valor: number }
  | { tipo: 'fora_de_area' };

const num = (v: unknown, padrao = 0): number => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : padrao;
};

/**
 * Preço para uma distância.
 *
 * A soma é ACUMULATIVA por trecho: `base + distância * caro` faria o preço
 * saltar reais num único metro na virada do segundo degrau.
 */
export function precoParaDistancia(f: FormulaDeEntrega, km: number): ResultadoDoPreco {
  const distancia = num(km);
  const base = num(f.taxaBase);
  const plano = num(f.raioPlanoKm);
  const porKm = num(f.porKm);
  const maximo = num(f.raioMaximoKm);
  const teto = f.taxaMaxima === null || f.taxaMaxima === undefined || f.taxaMaxima === ('' as unknown)
    ? null
    : num(f.taxaMaxima);

  // O teto transforma "longe demais" em "caro, mas atendido" — mesma regra do
  // backend: sem teto, fora do raio é fora de área.
  if (teto === null && distancia > maximo) return { tipo: 'fora_de_area' };

  let valor: number;
  if (distancia <= plano) {
    valor = base;
  } else {
    const longe = f.encareceEmKm === null || f.encareceEmKm === undefined || f.encareceEmKm === ('' as unknown)
      ? null
      : num(f.encareceEmKm);
    const porKmLonge = f.porKmLonge ? num(f.porKmLonge) : porKm;

    valor = longe !== null && distancia > longe && longe > plano
      ? base + (longe - plano) * porKm + (distancia - longe) * porKmLonge
      : base + (distancia - plano) * porKm;
  }

  if (teto !== null) valor = Math.min(valor, teto);
  return { tipo: 'cobrado', valor: Math.round(valor * 100) / 100 };
}

/** Distâncias da prévia — cobrem perto, médio, longe e o limite. */
export const DISTANCIAS_DA_PREVIA = [2, 5, 10, 15];

export interface LinhaDaPrevia {
  km: number;
  resultado: ResultadoDoPreco;
}

export function previaDePrecos(
  f: FormulaDeEntrega,
  distancias: number[] = DISTANCIAS_DA_PREVIA,
): LinhaDaPrevia[] {
  return distancias.map((km) => ({ km, resultado: precoParaDistancia(f, km) }));
}

/**
 * Problemas que tornam a fórmula incoerente.
 *
 * Devolve frases prontas, não códigos: o dono precisa saber o que corrigir, e
 * um `errors.raioPlano.gte` não diz isso a ninguém.
 */
export function problemasDaFormula(f: FormulaDeEntrega): string[] {
  const p: string[] = [];
  if (num(f.taxaBase) < 0) p.push('A taxa base não pode ser negativa.');
  if (num(f.porKm) < 0) p.push('O valor por km não pode ser negativo.');
  if (num(f.raioMaximoKm) <= 0) p.push('O raio máximo precisa ser maior que zero.');
  if (num(f.raioPlanoKm) > num(f.raioMaximoKm)) {
    p.push('O raio plano é maior que o raio máximo — ninguém chegaria a pagar por km.');
  }
  const longe = f.encareceEmKm ? num(f.encareceEmKm) : null;
  if (longe !== null) {
    if (longe <= num(f.raioPlanoKm)) {
      p.push('O ponto onde o km encarece precisa ser maior que o raio plano.');
    }
    if (longe > num(f.raioMaximoKm)) {
      p.push('O km encarece depois do raio máximo — esse trecho nunca é cobrado.');
    }
    if (f.porKmLonge != null && num(f.porKmLonge) < num(f.porKm)) {
      p.push('O km distante está mais barato que o km perto — confira se é isso mesmo.');
    }
  }
  return p;
}

const km = (v: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(num(v));
const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num(v)).replace(/\u00a0/g, ' ');

/** Não entrega além do raio fixo: o máximo coincide com o raio plano. */
export const soValorFixo = (f: FormulaDeEntrega): boolean =>
  num(f.raioMaximoKm) <= num(f.raioPlanoKm);

/** A regra numa frase — é o que o dono confere antes de salvar. */
export function fraseDoPreco(f: FormulaDeEntrega): string {
  const fixo = `${brl(f.taxaBase)} em qualquer entrega até ${km(f.raioPlanoKm)} km.`;
  if (soValorFixo(f)) return `${fixo} Acima disso, não entrega.`;
  return `${fixo} Depois, + ${brl(f.porKm)} por km, até ${km(f.raioMaximoKm)} km.`;
}

/**
 * Distâncias da prévia: as de referência mais a borda do valor fixo (o último
 * km dele e o primeiro depois) — é onde o preço muda, e onde o dono olha.
 */
export function distanciasDaPrevia(f: FormulaDeEntrega): number[] {
  const plano = num(f.raioPlanoKm);
  const todas = new Set([...DISTANCIAS_DA_PREVIA, ...(plano > 0 ? [plano, plano + 1] : [])]);
  return [...todas].sort((a, b) => a - b);
}
