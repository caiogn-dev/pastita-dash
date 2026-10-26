/**
 * Texto pronto para divulgar um cupom (26/10): a tela criava o cupom e parava
 * aí — o lojista tinha que redigir a mensagem e caçar o link do cardápio.
 */
import { formatCurrency } from '../../utils/formatters';

interface CupomDivulgavel {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  valid_until?: string;
}

export const textoDeDivulgacao = (cupom: CupomDivulgavel, linkDoCardapio: string | null): string => {
  const desconto = cupom.discount_type === 'percentage'
    ? `${Number(cupom.discount_value)}% de desconto`
    : `${formatCurrency(Number(cupom.discount_value))} de desconto`;
  const minimo = Number(cupom.min_purchase) > 0
    ? ` em pedidos a partir de ${formatCurrency(Number(cupom.min_purchase))}`
    : '';
  const fim = cupom.valid_until ? new Date(cupom.valid_until) : null;
  const validade = fim && !Number.isNaN(fim.getTime())
    ? ` Vale até ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}.`
    : '';
  const link = linkDoCardapio ? `\n${linkDoCardapio}` : '';
  return `Use o cupom *${cupom.code}* e ganhe ${desconto}${minimo}.${validade}${link}`;
};
