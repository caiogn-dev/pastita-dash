/**
 * Trava do fuso da suíte.
 *
 * O painel raciocina em horário de Brasília: os marcos de um pedido chegam com
 * offset (`-03:00`) e a régua/kanban formatam a hora de volta na parede do
 * lojista. Vários testes de `src/pages/orders` foram escritos assumindo esse
 * fuso — eles montam datas `-03:00` e esperam a mesma hora de volta, e decidem
 * o que é "hoje" pela virada do dia em Brasília.
 *
 * Numa máquina em UTC (a CI da nuvem, por exemplo) sem fixar o fuso, o mesmo
 * código formata 3h adiantado e a coluna "Entregue" passa a arrastar o pedido
 * de ontem — vermelho que depende do relógio da máquina, não do código. Este
 * teste garante que o fuso está fixado, para que a suíte seja determinística
 * onde quer que rode.
 */
describe('fuso da suíte', () => {
  it('roda em horário de Brasília (America/Sao_Paulo)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
  });

  it('formata um marco -03:00 na mesma hora da parede', () => {
    const hora = new Date('2026-09-09T07:29:00-03:00').toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(hora).toBe('07:29');
  });
});
