/**
 * Link e coordenada não são endereço para quem lê.
 *
 * No CE-2609103109 (10/set) o operador colou o link do WhatsApp no PDV e o
 * pedido foi salvo com `street = "https://maps.app.goo.gl/i1Vcfc5fDj45Ja9U7"`.
 * A entrega até acontece — a coordenada existe — mas a comanda, a etiqueta e o
 * próximo pedido dessa cliente recebem uma URL.
 *
 * O servidor já conserta na gravação. Aqui o ponto é OUTRO: o operador precisa
 * VER o endereço na tela antes de fechar, para conferir e corrigir.
 */
import { eSoUmPontoNoMapa } from '../enderecoDoPedido';

describe('eSoUmPontoNoMapa', () => {
  it('link do Maps é só um ponto', () => {
    expect(eSoUmPontoNoMapa('https://maps.app.goo.gl/i1Vcfc5fDj45Ja9U7')).toBe(true);
    expect(eSoUmPontoNoMapa('https://www.google.com/maps/@-10.18,-48.33,17z')).toBe(true);
  });

  it('par de coordenadas é só um ponto', () => {
    expect(eSoUmPontoNoMapa('-10.183138, -48.336260')).toBe(true);
  });

  it('o rótulo do pin do WhatsApp é só um ponto', () => {
    expect(eSoUmPontoNoMapa('Localização enviada (-10.18314, -48.33626)')).toBe(true);
  });

  it('endereço escrito por gente não é ponto', () => {
    expect(eSoUmPontoNoMapa('Quadra 104 Norte, Alameda 10, casa 3')).toBe(false);
    expect(eSoUmPontoNoMapa('Avenida JK 110 sul, Clínica DVI')).toBe(false);
    expect(eSoUmPontoNoMapa('')).toBe(false);
  });
});
