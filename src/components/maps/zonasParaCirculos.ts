/**
 * Traduz as faixas de entrega em círculos desenháveis.
 *
 * Isolado do componente de mapa porque é a única parte que dá para verificar
 * sem o Google carregado — e é onde moram as decisões que quebram em silêncio.
 *
 * DUAS QUE JÁ CUSTARAM CARO:
 *
 * 1. Ordem decrescente de raio. O Google pinta na ordem de criação, então um
 *    círculo grande criado depois cobre os menores: o mapa vira uma mancha só
 *    e some justamente a faixa mais próxima da loja, que é a que mais entrega.
 *
 * 2. Faixa sem km não vira círculo. Zona por CEP ou por polígono não tem raio;
 *    tratar ausência como zero poria um ponto no centro do mapa, que o dono lê
 *    como "entrego em 0 km".
 */
import type { DeliveryZone } from '../../services/delivery';

export interface CirculoDeZona {
  id: string;
  nome: string;
  raioMetros: number;
}

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
    const raioKm = km(z.max_km) ?? km(z.min_km);
    if (raioKm === null) continue;

    const raioMetros = Math.round(raioKm * 1000);
    // Duas faixas com o mesmo alcance e preços diferentes existem no banco
    // real. Dois círculos idênticos dobram a opacidade e criam um anel
    // fantasma que ninguém consegue explicar olhando o cadastro.
    if (!porRaio.has(raioMetros)) {
      porRaio.set(raioMetros, {
        id: String(z.id),
        nome: z.name || `${raioKm} km`,
        raioMetros,
      });
    }
  }

  return [...porRaio.values()].sort((a, b) => b.raioMetros - a.raioMetros);
}

export default zonasParaCirculos;
