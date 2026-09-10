/**
 * Fuso horário do painel.
 *
 * O Cardapidex é um SaaS de food delivery brasileiro: o "hoje" da cozinha é o
 * dia de PAREDE da loja, não o do navegador de quem abre o painel. Sem fixar o
 * fuso, a comparação de "mesmo dia" seguia o fuso do runtime — correta no
 * navegador do lojista em -03:00, mas errada para qualquer acesso de outro fuso
 * (suporte, dono viajando) e não determinística nos testes (o CI roda em UTC,
 * então um pedido entregue às 21h de ONTEM no Brasil "virava" de hoje na coluna
 * de finalizados).
 *
 * `America/Sao_Paulo` é o mesmo default já usado em `ScheduledMessagesPage`.
 * Quando a loja tiver o fuso confiável em mãos (`store.timezone`), passe-o como
 * argumento; o default cobre o caso comum e mantém as funções puras testáveis.
 */
export const FUSO_BRASIL = 'America/Sao_Paulo';

/**
 * As partes ano-mês-dia de uma data lidas NO fuso informado, no formato
 * `YYYY-MM-DD` (locale `en-CA`), pronto para comparar como string.
 */
export function diaNoFuso(data: Date, fuso: string = FUSO_BRASIL): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

/** Verdadeiro quando as duas datas caem no mesmo dia civil do fuso informado. */
export function mesmoDiaNoFuso(a: Date, b: Date, fuso: string = FUSO_BRASIL): boolean {
  return diaNoFuso(a, fuso) === diaNoFuso(b, fuso);
}
