/**
 * Testes de data precisam de fuso determinístico.
 *
 * Várias telas comparam o DIA local de um instante (`getDate`/`getMonth`…):
 * o quadro de pedidos só mostra em "Entregue" o que saiu HOJE, os relatórios
 * agrupam por dia, as etiquetas datam o pedido. "Hoje" é o dia da loja — um
 * restaurante brasileiro roda no fuso de São Paulo (-03).
 *
 * Sem fixar o fuso, a suíte herda o do runner: dev em -03 vê verde, mas a CI
 * (ubuntu = UTC) e a Vercel viam vermelho, porque 21:00 de ontem em -03 vira
 * 00:00 de hoje em UTC e o "mesmo dia" escorrega uma data. Fixamos o fuso do
 * teste no fuso do produto para a suíte ser reprodutível em qualquer máquina.
 */
describe('fuso horário determinístico dos testes', () => {
  it('roda no fuso da loja (America/Sao_Paulo), não no do runner', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
  });

  it('o dia local de um instante -03 não escorrega para o dia seguinte', () => {
    // 21:00 de 26/08 em -03 é ainda dia 26 na loja (00:00 UTC do dia 27).
    const instante = new Date('2026-08-26T21:00:00-03:00');
    expect(instante.getDate()).toBe(26);
    expect(instante.getMonth()).toBe(7); // agosto
    expect(instante.getFullYear()).toBe(2026);
  });
});
