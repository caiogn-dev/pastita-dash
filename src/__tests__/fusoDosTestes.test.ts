/**
 * Guarda do fuso horário da suíte.
 *
 * Vários módulos de pedidos decidem "mesmo dia" e formatam a hora de cada marco
 * pelo fuso LOCAL do runtime (`Date#getDate`, `toLocaleTimeString`). Em produção
 * o operador é brasileiro e o navegador está em America/Sao_Paulo, então a
 * conta bate. Mas a máquina de CI/nuvem roda em UTC: sem fixar o fuso, um pedido
 * de "ontem 21:00 -03:00" (00:00Z de hoje) vira "hoje" e um marco de "07:29
 * -03:00" é exibido como "10:29" — casos de `pedidosDoQuadro` e `fluxoDoPedido`
 * reprovam por 3h de diferença, sem nenhuma mudança de código.
 *
 * Este teste trava o invariante: a suíte roda no fuso do produto. Se alguém
 * remover o `process.env.TZ` do `jest.config.cjs`, ele reprova aqui — com a
 * causa escrita — em vez de virar vermelho intermitente espalhado por dezenas
 * de casos, coisa que ensina o time a ignorar o vermelho.
 */
describe('fuso horário da suíte', () => {
  it('roda em America/Sao_Paulo (o fuso do produto)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
  });

  it('trata 21:00 -03:00 de ontem como dia anterior a hoje 16:00 -03:00', () => {
    const ontem = new Date('2026-08-26T21:00:00-03:00');
    const hoje = new Date('2026-08-27T16:00:00-03:00');
    expect(ontem.getDate()).not.toBe(hoje.getDate());
  });

  it('formata a hora local no fuso do produto (07:29, não 10:29)', () => {
    const marco = new Date('2026-09-09T07:29:00-03:00');
    expect(marco.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })).toBe('07:29');
  });
});
