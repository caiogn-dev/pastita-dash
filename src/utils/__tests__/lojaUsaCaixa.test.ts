/**
 * "Uso caixa com dinheiro vivo" — a preferência mora em `store.metadata`.
 *
 * Falha ABERTO: sem loja carregada ou sem a chave, o Caixa aparece. Esconder
 * uma tela por erro de leitura é o dono procurando o que sumiu.
 */
import { lojaUsaCaixa, CHAVE_USA_CAIXA } from '../lojaUsaCaixa';

describe('lojaUsaCaixa', () => {
  it('loja sem a preferência usa caixa', () => {
    expect(lojaUsaCaixa({ metadata: {} })).toBe(true);
  });

  it('só desliga com false explícito', () => {
    expect(lojaUsaCaixa({ metadata: { [CHAVE_USA_CAIXA]: false } })).toBe(false);
    expect(lojaUsaCaixa({ metadata: { [CHAVE_USA_CAIXA]: true } })).toBe(true);
  });

  it('falha aberto: loja ainda não carregada ou metadata ausente mostra o Caixa', () => {
    expect(lojaUsaCaixa(null)).toBe(true);
    expect(lojaUsaCaixa(undefined)).toBe(true);
    expect(lojaUsaCaixa({} as never)).toBe(true);
  });
});
