/**
 * "Quem veio pela Elisangela?"
 *
 * A pergunta do dono (04/09) que a tela de cashback não respondia. Ela
 * mostrava "saldo de indicação: R$ 12,40" — um total somado, sem um nome. Com
 * isso a loja não consegue agradecer quem trouxe cliente, não sabe quem são
 * seus divulgadores, e não enxerga o telefone que "indicou" trinta
 * desconhecidos.
 *
 * O que a tela precisa é a leitura HUMANA de cada linha e o agrupamento por
 * quem indicou. O backend já manda os dois; aqui mora o que fazer com eles
 * quando o dado vem incompleto, que é o caso comum: quem indica pode nunca ter
 * comprado (não tem nome no cadastro), e o pedido do amigo pode ter sido feito
 * sem nome.
 */
import { rotuloDoIndicador, rotuloDoAmigo, ordenarIndicadores } from '../indicacoes';

describe('rótulo de quem indicou', () => {
  it('usa o nome quando a loja o conhece', () => {
    expect(rotuloDoIndicador({ phone: '5563999547790', nome: 'Elisangela Souza' }))
      .toBe('Elisangela Souza');
  });

  it('cai no telefone legível quando não há nome', () => {
    // Quem indica pode nunca ter comprado. Mostrar o telefone cru — ou pior,
    // "—" — deixa o dono sem saber a quem agradecer.
    expect(rotuloDoIndicador({ phone: '5563999547790', nome: '' }))
      .toBe('(63) 99954-7790');
  });

  it('não quebra sem telefone nem nome', () => {
    expect(rotuloDoIndicador({ phone: '', nome: '' })).toBe('Sem identificação');
  });
});

describe('rótulo do amigo indicado', () => {
  it('prefere o nome do pedido', () => {
    expect(rotuloDoAmigo({ amigo_nome: 'Kamilly Araújo', amigo_phone: '5563981286498' }))
      .toBe('Kamilly Araújo');
  });

  it('cai no telefone quando o pedido saiu sem nome', () => {
    expect(rotuloDoAmigo({ amigo_nome: '', amigo_phone: '5563981286498' }))
      .toBe('(63) 98128-6498');
  });
});

describe('ordem dos indicadores', () => {
  const linhas = [
    { phone: '1', nome: 'Uma', total_indicados: 1, total_creditado: '9.00' },
    { phone: '2', nome: 'Elisangela', total_indicados: 3, total_creditado: '6.00' },
    { phone: '3', nome: 'Outra', total_indicados: 3, total_creditado: '8.00' },
  ];

  it('quem trouxe mais gente vem primeiro', () => {
    // A pergunta da tela é "quem são meus divulgadores", não "quem custou
    // mais". Ordenar por dinheiro colocaria na frente quem trouxe um cliente
    // grande, e não quem traz cliente toda semana.
    expect(ordenarIndicadores(linhas).map((l) => l.nome))
      .toEqual(['Outra', 'Elisangela', 'Uma']);
  });

  it('empate em pessoas desempata pelo valor', () => {
    const [primeiro] = ordenarIndicadores(linhas);
    expect(primeiro.nome).toBe('Outra');
  });

  it('lista vazia não quebra', () => {
    expect(ordenarIndicadores([])).toEqual([]);
  });
});
