/**
 * Traduz as faixas de entrega em círculos desenháveis.
 *
 * Isolado do componente de mapa porque é a única parte verificável sem o
 * Google carregado — e é onde moram as decisões que quebram em silêncio.
 *
 * TRÊS QUE JÁ CUSTARAM CARO:
 *
 * 1. Ordem decrescente de raio. O Google pinta na ordem de criação, então um
 *    círculo grande criado depois cobre os menores: o mapa vira uma mancha só
 *    e some justamente a faixa mais próxima da loja, que é a que mais entrega.
 *
 * 2. Faixa sem km não vira círculo. Zona por CEP ou por polígono não tem raio;
 *    tratar ausência como zero poria um ponto no centro do mapa, que o dono lê
 *    como "entrego em 0 km".
 *
 * 3. `max_km = 999` é SENTINELA de "sem limite", não medida. A última faixa do
 *    cadastro real é "17km+" com 999. Desenhar isso põe um anel do tamanho da
 *    região Norte sobre o mapa e arrasta o enquadramento junto — a área de
 *    entrega de verdade encolhe até virar um ponto invisível.
 */
import type { DeliveryZone } from '../../services/delivery';

export interface CirculoDeZona {
  id: string;
  nome: string;
  raioMetros: number;
  /** Faixa sem limite superior ("17km+"): o anel marca onde ela COMEÇA. */
  aberta: boolean;
}

/**
 * Acima disto não é raio de entrega, é sentinela.
 *
 * 150 km de moto são ~3h só de ida. Nenhuma faixa de delivery real chega
 * perto, e os valores que aparecem no banco (999) são convenção para "daqui
 * em diante". Checar por `=== 999` seria frágil: a próxima loja pode gravar
 * 9999 ou 1000.
 */
const LIMITE_PLAUSIVEL_KM = 150;

/** `max_km` é DecimalField no backend: chega como "2.00", não como 2. */
function km(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function zonasParaCirculos(zonas?: DeliveryZone[] | null): CirculoDeZona[] {
  if (!zonas?.length) return [];

  const porRaio = new Map<number, CirculoDeZona>();

  for (const z of zonas) {
    if (z.is_active === false) continue;

    const max = km(z.max_km);
    const min = km(z.min_km);

    // Faixa aberta: o anel útil é onde ela começa, não onde a sentinela diz
    // que termina. Sem `min_km` não há onde desenhar — "sem limite a partir de
    // lugar nenhum" não é uma área.
    const aberta = max !== null && max > LIMITE_PLAUSIVEL_KM;
    const raioKm = aberta ? min : (max ?? min);
    if (raioKm === null) continue;

    const raioMetros = Math.round(raioKm * 1000);
    // Duas faixas com o mesmo alcance e preços diferentes existem no banco
    // real. Dois círculos idênticos dobram a opacidade e criam um anel
    // fantasma que ninguém explica olhando o cadastro.
    if (!porRaio.has(raioMetros)) {
      porRaio.set(raioMetros, {
        id: String(z.id),
        nome: z.name || `${raioKm} km`,
        raioMetros,
        aberta,
      });
    }
  }

  return [...porRaio.values()].sort((a, b) => b.raioMetros - a.raioMetros);
}

export default zonasParaCirculos;
