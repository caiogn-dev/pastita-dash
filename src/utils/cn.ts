import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * A escala tipográfica por papel (tailwind.config.js → fontSize) precisa ser
 * declarada aqui. Sem isso o tailwind-merge lê `text-badge` como COR e apaga
 * a cor do texto que veio antes — o botão de avançar pedido perdia o
 * `text-on-brand` e o rótulo sumia sobre a tinta.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['overline', 'badge', 'caption', 'body', 'lead'] }],
    },
  },
});

/**
 * Utility function to merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
