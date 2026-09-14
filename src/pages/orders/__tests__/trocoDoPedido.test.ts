import { textoDoTroco } from '../trocoDoPedido';

describe('textoDoTroco', () => {
  it('ninguém perguntou: não mostra nada', () => {
    expect(textoDoTroco(null, null)).toBeNull();
    expect(textoDoTroco(undefined, undefined)).toBeNull();
  });

  it('zero é "não precisa de troco"', () => {
    expect(textoDoTroco('0.00', '0')).toBe('Não precisa de troco');
  });

  it('troco para e quanto levar', () => {
    const texto = textoDoTroco('100.00', '65.00');
    expect(texto).toMatch(/Troco para R\$\s?100,00/);
    expect(texto).toMatch(/levar R\$\s?65,00/);
  });
});
