/**
 * 20/10: o botão de avançar pedido ("Preparar", "Entregue") passa
 * `text-badge` — tamanho por papel da nossa escala. O tailwind-merge não
 * conhecia a escala, leu `text-badge` como COR e apagou o `text-on-brand`
 * do botão. Sobre o ouro o texto herdado escuro escondia o erro; com o
 * botão carvão do tema claro o rótulo sumiu (preto sobre preto).
 */
import { cn } from '../cn';

describe('cn — escala tipográfica por papel', () => {
  it.each(['overline', 'badge', 'caption', 'body', 'lead'])(
    'text-%s é tamanho: não apaga a cor do texto',
    (papel) => {
      expect(cn('text-on-brand', `text-${papel}`).split(' ')).toEqual(['text-on-brand', `text-${papel}`]);
    },
  );

  it('tamanho por papel substitui tamanho do Tailwind', () => {
    expect(cn('text-xs', 'text-caption')).toBe('text-caption');
  });

  it('cor continua substituindo cor', () => {
    expect(cn('text-on-brand', 'text-fg-token')).toBe('text-fg-token');
  });
});
