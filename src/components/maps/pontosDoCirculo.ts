/**
 * Os pontos de um círculo geográfico, para desenhar um anel tracejado.
 *
 * POR QUE ISTO EXISTE: `google.maps.Circle` não expõe `getPath()` — isso é da
 * `Polygon`. A primeira versão do anel da promoção pedia `circle.getPath()`,
 * recebia `undefined`, caía num caminho vazio e não desenhava NADA. Como o
 * círculo estava com `strokeOpacity: 0` (contando com o tracejado por cima),
 * o resultado foi um mapa sem anel nenhum e sem um erro sequer no console.
 *
 * Fórmula do ponto de destino a partir de rumo e distância (great-circle).
 * Não dá para somar `raio/111320` na latitude e repetir na longitude: um grau
 * de longitude encolhe com o cosseno da latitude, e o "círculo" sai achatado.
 */
export interface PontoGeo {
  lat: number;
  lng: number;
}

const RAIO_TERRA_M = 6371000;
const paraRad = (graus: number) => (graus * Math.PI) / 180;
const paraGraus = (rad: number) => (rad * 180) / Math.PI;

export function pontosDoCirculo(
  centro: PontoGeo,
  raioMetros: number,
  // 72 passos = um ponto a cada 5°. Abaixo de ~32 o anel vira um polígono
  // visível no zoom em que se julga um raio de 3 km.
  passos = 72,
): PontoGeo[] {
  if (!Number.isFinite(raioMetros) || raioMetros <= 0) return [];

  const lat0 = paraRad(centro.lat);
  const lng0 = paraRad(centro.lng);
  const d = raioMetros / RAIO_TERRA_M;
  const pontos: PontoGeo[] = [];

  // `<= passos`: o último ponto repete o primeiro e FECHA o anel. Sem ele a
  // polyline deixa uma fatia aberta e o desenho parece um "C".
  for (let i = 0; i <= passos; i += 1) {
    const rumo = (2 * Math.PI * i) / passos;
    const lat = Math.asin(
      Math.sin(lat0) * Math.cos(d) + Math.cos(lat0) * Math.sin(d) * Math.cos(rumo),
    );
    const lng =
      lng0 +
      Math.atan2(
        Math.sin(rumo) * Math.sin(d) * Math.cos(lat0),
        Math.cos(d) - Math.sin(lat0) * Math.sin(lat),
      );
    pontos.push({ lat: paraGraus(lat), lng: paraGraus(lng) });
  }

  return pontos;
}

export default pontosDoCirculo;
