/**
 * Extrai lat/lng de um texto que o operador cola no campo de endereço:
 * link do Google Maps ou "lat,lng" cru. É como se aproveita a LOCALIZAÇÃO que
 * o cliente manda no WhatsApp — o pin vira coordenadas e o frete calcula por
 * distância, sem depender de geocodificar um texto vago ("Secretaria...").
 *
 * Shortlinks (maps.app.goo.gl / goo.gl) NÃO dão para resolver no navegador —
 * retornam null e caímos no fluxo de endereço por texto.
 */
export interface Coords { lat: number; lng: number; }

const dentroDoBrasil = (lat: number, lng: number) =>
  lat >= -34 && lat <= 6 && lng >= -74 && lng <= -34;

const parNumerico = (a: string, b: string): Coords | null => {
  const lat = Number(a); const lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

export const parseCoords = (texto: string): Coords | null => {
  if (!texto) return null;
  const t = texto.trim();

  // 1) Links do Google Maps, do MAIS confiável para o menos.
  //
  //    `!3d!4d` é o PIN — o lugar de verdade.
  //    `@lat,lng` é o CENTRO DA TELA de quem gerou o link.
  //
  //    No link do CE-2608103109 os dois diferem 280 m em longitude. Ler o
  //    centro cotava o frete e mandava o entregador para outra quadra, então a
  //    ordem aqui não é estética: o pin tem que ser testado primeiro.
  const padroesUrl = [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,                            // o PIN
    /[?&](?:query|q|destination)=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)/i, // encodado
    /[?&](?:query|q|destination)=(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/i,
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,                                // centro da tela
  ];
  if (/maps|google|geo:/i.test(t)) {
    for (const re of padroesUrl) {
      const m = t.match(re);
      if (m) { const c = parNumerico(m[1], m[2]); if (c) return c; }
    }
  }

  // 2) "lat,lng" cru (o texto INTEIRO é só o par) — evita casar número de rua.
  const cru = t.match(/^\s*(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})\s*$/);
  if (cru) {
    const c = parNumerico(cru[1], cru[2]);
    if (c && dentroDoBrasil(c.lat, c.lng)) return c;
  }

  return null;
};
