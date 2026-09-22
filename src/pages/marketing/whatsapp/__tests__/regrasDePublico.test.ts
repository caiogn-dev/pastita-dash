/**
 * Mexer em grupo e condição sem espalhar splice pelo componente.
 */
import {
  REGRA_VAZIA, adicionarCondicao, adicionarGrupo, condicaoCompleta, mudarCondicao,
  quantosValores, regraLimpa, removerCondicao, temAlgumaCondicao,
  type CampoDoCatalogo,
} from '../regrasDePublico';

const campoNumero: CampoDoCatalogo = {
  campo: 'pedidos', rotulo: 'Pedidos feitos', tipo: 'numero',
  operadores: ['maior_que', 'entre'],
  operadores_detalhe: [
    { operador: 'maior_que', rotulo: 'é maior que' },
    { operador: 'entre', rotulo: 'está entre', valores: 2 },
  ],
};

it('"está entre" pede duas caixas de valor', () => {
  expect(quantosValores(campoNumero, 'entre')).toBe(2);
  expect(quantosValores(campoNumero, 'maior_que')).toBe(1);
});

it('meia condição é rascunho, não vai para o servidor', () => {
  expect(condicaoCompleta({ campo: 'pedidos' })).toBe(false);
  expect(condicaoCompleta({ campo: 'pedidos', operador: 'maior_que', valor: 3 })).toBe(true);
  expect(condicaoCompleta({ campo: 'pedidos', operador: 'maior_que', valor: '' })).toBe(false);
});

it('a regra limpa descarta rascunho e grupo vazio', () => {
  const r = { grupos: [
    { condicoes: [{ campo: 'pedidos', operador: 'maior_que', valor: 3 }, { campo: 'bairro' }] },
    { condicoes: [{}] },
  ] };

  expect(regraLimpa(r)).toEqual({
    grupos: [{ condicoes: [{ campo: 'pedidos', operador: 'maior_que', valor: 3 }] }],
  });
  expect(temAlgumaCondicao(r)).toBe(true);
  expect(temAlgumaCondicao(REGRA_VAZIA)).toBe(false);
});

it('trocar o campo zera operador e valor', () => {
  const r = { grupos: [{ condicoes: [{ campo: 'pedidos', operador: 'maior_que', valor: 3 }] }] };

  expect(mudarCondicao(r, 0, 0, { campo: 'bairro' }).grupos[0].condicoes[0])
    .toEqual({ campo: 'bairro' });
});

it('trocar o operador zera só o valor', () => {
  const r = { grupos: [{ condicoes: [{ campo: 'pedidos', operador: 'maior_que', valor: 3 }] }] };

  expect(mudarCondicao(r, 0, 0, { operador: 'entre' }).grupos[0].condicoes[0])
    .toEqual({ campo: 'pedidos', operador: 'entre', valor: undefined });
});

it('grupo que fica sem condição desaparece', () => {
  const r = { grupos: [
    { condicoes: [{ campo: 'a', operador: 'x', valor: 1 }] },
    { condicoes: [{ campo: 'b', operador: 'y', valor: 2 }] },
  ] };

  expect(removerCondicao(r, 1, 0).grupos).toHaveLength(1);
});

it('remover a última condição deixa uma caixa em branco, não uma tela vazia', () => {
  const r = { grupos: [{ condicoes: [{ campo: 'a', operador: 'x', valor: 1 }] }] };

  expect(removerCondicao(r, 0, 0)).toEqual(REGRA_VAZIA);
});

it('adicionar condição e grupo', () => {
  expect(adicionarCondicao(REGRA_VAZIA, 0).grupos[0].condicoes).toHaveLength(2);
  expect(adicionarGrupo(REGRA_VAZIA).grupos).toHaveLength(2);
});
