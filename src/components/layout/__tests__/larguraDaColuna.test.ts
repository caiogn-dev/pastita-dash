import { recuoDaNavbar, publicarRecuo, VAR_RECUO } from '../larguraDaColuna';

describe('recuo da navbar', () => {
  it('coluna parada não empurra nada', () => {
    expect(recuoDaNavbar(false)).toBe('0px');
  });

  it('coluna espiada empurra exatamente o que ela cresceu', () => {
    // 256 (aberta, o que `w-64` REALMENTE pinta) − 72 (reservada) = 184.
    // Estava 192 porque LARGURA_ABERTA dizia 264 e a classe dizia 256: a
    // navbar recuava 8px a mais do que a coluna ocupava.
    expect(recuoDaNavbar(true)).toBe('184px');
  });

  it('publica na raiz do documento, não no estado do React', () => {
    publicarRecuo(true);
    expect(document.documentElement.style.getPropertyValue(VAR_RECUO)).toBe('184px');
    publicarRecuo(false);
    expect(document.documentElement.style.getPropertyValue(VAR_RECUO)).toBe('0px');
  });
});
