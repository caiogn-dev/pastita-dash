import { estadoDaLista } from '../estadoDaLista';

const base = { temDados: false, buscando: false, falhou: false, quantidade: 0 };

it('primeira carga é "carregando"', () => {
  expect(estadoDaLista({ ...base, buscando: true })).toBe('carregando');
});

it('falha sem nada em cache é "falhou", nunca "vazio"', () => {
  // O vazio enganoso: a lista fica em [] e a tabela diria "ninguém comprou".
  expect(estadoDaLista({ ...base, falhou: true })).toBe('falhou');
});

it('retry não pisca a tela de erro', () => {
  // O retry devolve a consulta para pending ainda sem dados. Se "falhou"
  // ganhasse de "buscando", a tela de erro apareceria durante todo o refetch.
  expect(estadoDaLista({ ...base, falhou: true, buscando: true })).toBe('carregando');
});

it('busca que deu certo e veio zero é "vazio"', () => {
  expect(estadoDaLista({ ...base, temDados: true })).toBe('vazio');
});

it('com itens é "lista"', () => {
  expect(estadoDaLista({ ...base, temDados: true, quantidade: 3 })).toBe('lista');
});

it('falha no refetch NÃO apaga o que já está na tela', () => {
  expect(estadoDaLista({ temDados: true, buscando: false, falhou: true, quantidade: 3 }))
    .toBe('lista');
});
