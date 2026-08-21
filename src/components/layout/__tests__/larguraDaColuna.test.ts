import { recuoDaNavbar, publicarRecuo, VAR_RECUO } from '../larguraDaColuna';

describe('recuo da navbar', () => {
  it('coluna parada não empurra nada', () => {
    expect(recuoDaNavbar(false)).toBe('0px');
  });

  it('coluna espiada empurra exatamente o que ela cresceu', () => {
    // 264 (aberta) − 72 (reservada no fluxo) = 192
    expect(recuoDaNavbar(true)).toBe('192px');
  });

  it('publica na raiz do documento, não no estado do React', () => {
    publicarRecuo(true);
    expect(document.documentElement.style.getPropertyValue(VAR_RECUO)).toBe('192px');
    publicarRecuo(false);
    expect(document.documentElement.style.getPropertyValue(VAR_RECUO)).toBe('0px');
  });
});
