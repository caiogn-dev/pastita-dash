/**
 * O anel da promoção é desenhado ponto a ponto porque `google.maps.Circle`
 * NÃO expõe `getPath()` — isso é da `Polygon`. Confiar em `getPath` devolvia
 * um caminho vazio e o anel simplesmente não aparecia no mapa, sem erro algum.
 */
import { pontosDoCirculo } from '../pontosDoCirculo';

const RAIO_TERRA = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância real entre dois pontos, para conferir o raio desenhado. */
const metros = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA * Math.asin(Math.sqrt(h));
};

const PALMAS = { lat: -10.1853248, lng: -48.3037058 };

describe('pontosDoCirculo', () => {
  it('todo ponto fica na distância pedida do centro', () => {
    const pontos = pontosDoCirculo(PALMAS, 3000, 72);
    for (const p of pontos) {
      expect(metros(PALMAS, p)).toBeCloseTo(3000, -1);
    }
  });

  // Sem fechar, a polyline deixa uma fatia aberta no anel — parece um "C" e o
  // dono acha que a área tem um buraco.
  it('fecha o anel: último ponto igual ao primeiro', () => {
    const pontos = pontosDoCirculo(PALMAS, 3000, 24);
    expect(pontos).toHaveLength(25);
    expect(pontos[24].lat).toBeCloseTo(pontos[0].lat, 9);
    expect(pontos[24].lng).toBeCloseTo(pontos[0].lng, 9);
  });

  it('longitude se abre mais que latitude perto do equador', () => {
    const pontos = pontosDoCirculo(PALMAS, 3000, 4);
    const norte = pontos[0];
    const leste = pontos[1];
    expect(Math.abs(leste.lng - PALMAS.lng)).toBeGreaterThan(Math.abs(norte.lat - PALMAS.lat));
  });

  it('raio zero ou negativo não vira caminho', () => {
    expect(pontosDoCirculo(PALMAS, 0)).toEqual([]);
    expect(pontosDoCirculo(PALMAS, -100)).toEqual([]);
  });
});
