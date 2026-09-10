/**
 * No link longo do Google Maps existem DUAS coordenadas:
 *
 *   @-10.2566394,-48.3153351   ← o CENTRO da tela quando o link foi gerado
 *   !3d-10.2566394!4d-48.3127602 ← o PIN, o lugar de verdade
 *
 * No link real do CE-2609103109 (Cê Saladas, 10/set, colado no PDV) as duas
 * diferem 280 m em longitude. `parseCoords` testava o `@` ANTES do `!3d!4d`,
 * então o frete e a rota saíam do centro da tela — outra quadra.
 */
import { parseCoords } from '../parseCoords';

const LINK_REAL = 'https://www.google.com/maps/place/10%C2%B015\'23.9%22S+48%C2%B018\'45.9%22W/'
  + '@-10.2566394,-48.3153351,17z/data=!3m1!4b1!4m4!3m3!8m2!3d-10.2566394!4d-48.3127602';

it('o pin vence o centro da tela', () => {
  expect(parseCoords(LINK_REAL)).toEqual({ lat: -10.2566394, lng: -48.3127602 });
});

it('sem pin no link, o centro ainda serve', () => {
  expect(parseCoords('https://www.google.com/maps/@-10.18314,-48.33626,17z'))
    .toEqual({ lat: -10.18314, lng: -48.33626 });
});

it('endereço escrito não vira coordenada', () => {
  expect(parseCoords('Quadra 104 Norte Alameda 10, casa 3')).toBeNull();
});
