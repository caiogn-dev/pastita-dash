/**
 * Contrato de fuso da suíte.
 *
 * Vários testes de pedidos (fluxoDoPedido, pedidosDoQuadro) assertam horas e o
 * corte do dia formatados no horário de Brasília. Se o fuso da suíte deixar de
 * ser fixado (ex.: alguém remove o `process.env.TZ` do setup), esses testes
 * passam a falhar de forma obscura no CI/Vercel (UTC) — 07:29 vira 10:29. Este
 * teste falha ANTES, com uma mensagem clara, apontando para a causa.
 */
it('roda no fuso de Brasília, não no fuso da máquina', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
});

it('formata um horário com offset -03:00 sem deslocar', () => {
  const hora = new Date('2026-09-09T07:29:00-03:00').toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  expect(hora).toBe('07:29');
});
