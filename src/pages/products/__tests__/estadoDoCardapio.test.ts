import { estadoDoCardapio } from '../estadoDoCardapio';

const base = { temDados: true, buscando: false, falhou: false, quantidade: 3 };

describe('estado do cardápio', () => {
  it('loja nova com zero produtos tem estado próprio', () => {
    // Sem ele, quem acabou de criar a loja vê indicadores zerados e uma lista
    // vazia, sem nada dizendo o que fazer.
    expect(estadoDoCardapio({ ...base, quantidade: 0 })).toBe('vazio');
  });

  it('cardápio vazio POR FALHA não é "cadastre seu primeiro produto"', () => {
    // Dizer isso a quem tem 200 produtos e uma consulta caída é mentira.
    expect(estadoDoCardapio({ temDados: false, buscando: false, falhou: true, quantidade: 0 }))
      .toBe('falhou');
  });

  it('durante o retry mostra carregando, não o erro', () => {
    // O React Query tira a query de `error` e põe em `pending` ainda sem
    // dados; sem esta ordem, a tela de erro piscava durante todo o refetch.
    expect(estadoDoCardapio({ temDados: false, buscando: true, falhou: true, quantidade: 0 }))
      .toBe('carregando');
  });

  it('com produtos mostra a lista', () => {
    expect(estadoDoCardapio(base)).toBe('lista');
  });

  it('falha de fundo com cache mantém a lista', () => {
    // Atualização que falhou em segundo plano não pode apagar o cardápio da tela.
    expect(estadoDoCardapio({ ...base, falhou: true })).toBe('lista');
  });
});
