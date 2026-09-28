import { lerFatos, validarFato } from '../fatosDoBot';

describe('lerFatos', () => {
  it('lê só o que tem forma de fato; tema desconhecido vira outro; ativo por padrão', () => {
    expect(lerFatos({ bot_fatos: [
      { tema: 'entrega', texto: ' Entregamos em Taquaralto ', ativo: true },
      { tema: 'zzz', texto: 'Vale' },
      { tema: 'produtos', texto: '   ' },
      'string solta',
      { tema: 'loja', texto: 'Desligado', ativo: false },
    ] })).toEqual([
      { tema: 'entrega', texto: 'Entregamos em Taquaralto', ativo: true },
      { tema: 'outro', texto: 'Vale', ativo: true },
      { tema: 'loja', texto: 'Desligado', ativo: false },
    ]);
  });

  it('sem metadata ou sem a chave → vazio', () => {
    expect(lerFatos(undefined)).toEqual([]);
    expect(lerFatos({})).toEqual([]);
    expect(lerFatos({ bot_fatos: 'x' })).toEqual([]);
  });
});

describe('validarFato', () => {
  const lista = [{ tema: 'entrega' as const, texto: 'Entregamos em Taquaralto', ativo: true }];
  it('vazio, longo e repetido são recusados com motivo', () => {
    expect(validarFato({ tema: 'outro', texto: '  ', ativo: true }, lista)).toMatch(/escreva/i);
    expect(validarFato({ tema: 'outro', texto: 'a'.repeat(301), ativo: true }, lista)).toMatch(/longo/i);
    expect(validarFato({ tema: 'outro', texto: 'entregamos em taquaralto', ativo: true }, lista)).toMatch(/já está/i);
  });
  it('editar o próprio fato não conta como repetido', () => {
    expect(validarFato({ tema: 'entrega', texto: 'Entregamos em Taquaralto', ativo: true }, lista, 0)).toBe('');
  });
});
