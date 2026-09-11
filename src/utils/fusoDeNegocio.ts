/**
 * O fuso do NEGÓCIO, não o do dispositivo.
 *
 * O painel é operado no Brasil e o produto é inteiro pt-BR/R$. O "dia" de
 * trabalho do quadro de pedidos e o horário de cada marco da régua de status
 * são do negócio — não podem depender de como o relógio do celular ou do
 * servidor está configurado. Sem isso, um dispositivo em UTC (ou mal
 * configurado) arrasta o pedido entregue às 21h de ontem para a coluna de
 * finalizados de hoje e mostra 10:29 onde a loja fechou às 07:29.
 *
 * Há precedente no painel: `ScheduledMessagesPage` já ancora os agendamentos
 * em `America/Sao_Paulo`. São Paulo não tem horário de verão desde 2019, então
 * para o operador cujo dispositivo já está no horário de Brasília a saída é
 * idêntica à de antes — a fixação só remove a dependência do fuso de quem olha.
 */
export const FUSO_DE_NEGOCIO = 'America/Sao_Paulo';

/** "YYYY-MM-DD" do instante no fuso informado — comparável como string. */
function diaNoFuso(quando: Date, fuso: string): string {
  // `en-CA` formata a data como ISO (2026-08-27), o que torna a comparação de
  // "mesmo dia" um simples `===` de strings.
  return quando.toLocaleDateString('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Dois instantes caem no mesmo dia do calendário no fuso do negócio? */
export function mesmoDiaNoFuso(a: Date, b: Date, fuso = FUSO_DE_NEGOCIO): boolean {
  return diaNoFuso(a, fuso) === diaNoFuso(b, fuso);
}

/** "07:29" — a hora do instante no fuso do negócio, relógio de 24h. */
export function horaNoFuso(quando: Date, fuso = FUSO_DE_NEGOCIO): string {
  return quando.toLocaleTimeString('pt-BR', {
    timeZone: fuso,
    hour: '2-digit',
    minute: '2-digit',
  });
}
