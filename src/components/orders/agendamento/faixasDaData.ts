export type DiaDaAgenda = { data: string; faixas: string[] };

/**
 * Faixas para oferecer no painel numa data.
 *
 * Dia que está na agenda da loja: as faixas daquele dia. Fora dela (data
 * passada, longe, ou hoje já sem faixa): todas as faixas que a loja usa — o
 * lojista pode corrigir um pedido antigo. A faixa já gravada no pedido entra
 * sempre, senão ela some da tela e o pedido parece não ter agendamento.
 */
export function faixasDaData(agenda: DiaDaAgenda[], data: string, atual: string): string[] {
  const doDia = agenda.find((d) => d.data === data)?.faixas;
  const base = doDia ?? agenda.flatMap((d) => d.faixas);
  const todas = new Set(base);
  if (atual) todas.add(atual);
  return [...todas].sort();
}
