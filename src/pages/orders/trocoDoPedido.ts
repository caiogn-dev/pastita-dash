/**
 * Frase do troco do pagamento em dinheiro, para a tela do pedido.
 *
 * `change_for`: null = ninguém perguntou (não mostra nada); 0 = o cliente
 * disse que não precisa; > 0 = "troco para". `change_due` vem pronto do
 * backend (change_for - total).
 */
import { formatCurrency } from '../../utils/formatters';

export const textoDoTroco = (
  changeFor: number | string | null | undefined,
  changeDue: number | string | null | undefined,
): string | null => {
  if (changeFor === null || changeFor === undefined || changeFor === '') return null;
  const para = Number(changeFor);
  if (Number.isNaN(para)) return null;
  if (para === 0) return 'Não precisa de troco';
  const levar = Number(changeDue);
  return Number.isNaN(levar)
    ? `Troco para ${formatCurrency(para)}`
    : `Troco para ${formatCurrency(para)} · levar ${formatCurrency(levar)}`;
};
