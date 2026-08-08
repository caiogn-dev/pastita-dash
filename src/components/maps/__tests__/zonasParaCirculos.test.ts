/**
 * As faixas de entrega viram círculos no mapa.
 *
 * A página de Zonas de Entrega mostrava um iframe estático do Google com um
 * pin — e nem o pin acertava: `buildMapUrls` preferia BUSCAR PELO NOME da loja
 * a usar a latitude/longitude que já estavam no banco. Loja não cadastrada no
 * Google Maps (a maioria) caía num lugar errado ou em lugar nenhum.
 *
 * E raio nenhum era desenhado, apesar de `min_km`/`max_km` estarem preenchidos
 * nas 16 faixas de cada loja. O componente que desenha os círculos existia e
 * era código morto.
 *
 * Esta função é a parte testável sem o Google carregado: quais faixas viram
 * círculo, com que raio, em que ordem.
 */
import { zonasParaCirculos } from '../zonasParaCirculos';

const z = (over: Record<string, unknown>) =>
  ({ id: String(Math.random()), name: 'x', is_active: true, ...over } as never);

describe('zonasParaCirculos', () => {
  it('usa max_km como raio, em metros', () => {
    expect(zonasParaCirculos([z({ max_km: 2 })])[0].raioMetros).toBe(2000);
  });

  it('desenha do maior para o menor', () => {
    // O Google pinta na ordem em que os círculos são criados. Um círculo
    // grande criado depois cobre o pequeno, e o mapa vira uma mancha só —
    // some a faixa mais próxima da loja, que é justamente a que mais entrega.
    const raios = zonasParaCirculos([
      z({ max_km: 2 }),
      z({ max_km: 10 }),
      z({ max_km: 5 }),
    ]).map((c) => c.raioMetros);
    expect(raios).toEqual([10000, 5000, 2000]);
  });

  it('faixa sem raio não vira círculo', () => {
    // Zona por CEP ou por polígono não tem km. Tratar ausência como 0 poria um
    // ponto no centro do mapa, que o dono leria como "entrego em 0 km".
    expect(zonasParaCirculos([z({ max_km: null, min_km: null })])).toHaveLength(0);
  });

  it('cai para min_km quando max_km falta', () => {
    expect(zonasParaCirculos([z({ max_km: null, min_km: 3 })])[0].raioMetros).toBe(3000);
  });

  it('faixa inativa não aparece', () => {
    // Desenhar zona desligada faz a área de cobertura parecer maior do que é.
    expect(zonasParaCirculos([z({ max_km: 5, is_active: false })])).toHaveLength(0);
  });

  it('faixas de mesmo raio viram um círculo só', () => {
    // Duplicata acontece (duas faixas "até 11 km" com preços diferentes). Dois
    // círculos idênticos dobram a opacidade e criam um anel fantasma.
    expect(zonasParaCirculos([z({ max_km: 5 }), z({ max_km: 5 })])).toHaveLength(1);
  });

  it('aceita km como string, que é como o DRF serializa decimal', () => {
    // `max_km` é DecimalField: vem "2.00", não 2. Number('2.00') funciona, mas
    // `!maxKm` num "0.00" seria false-y por acidente de tipo.
    expect(zonasParaCirculos([z({ max_km: '2.00' })])[0].raioMetros).toBe(2000);
  });

  it('lista vazia não quebra', () => {
    expect(zonasParaCirculos([])).toEqual([]);
    expect(zonasParaCirculos(undefined)).toEqual([]);
  });
});
