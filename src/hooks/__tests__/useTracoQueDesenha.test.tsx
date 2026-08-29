import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTracoQueDesenha } from '../useTracoQueDesenha';

/**
 * A sparkline aparecia inteira de uma vez. Desenhando da esquerda para a
 * direita, ela conta a mesma coisa que conta na cabeça de quem lê: o tempo
 * passando. É barato e é honesto — a linha não muda, só chega andando.
 *
 * Nem CSS nem recharts fazem isso bem; `stroke-dashoffset` sobre o
 * comprimento real do traço é território de anime.js.
 */

const Traco = ({ d }: { d: string }) => {
  const ref = useTracoQueDesenha<SVGPathElement>([d]);
  return (
    <svg>
      <path data-testid="linha" ref={ref} d={d} />
    </svg>
  );
};

const comMovimento = (reduzido: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({
      matches: reduzido && q.includes('reduce'),
      media: q,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false, onchange: null,
    }),
  });
};

describe('traço que desenha', () => {
  it('quem pede menos movimento vê a linha inteira, sem corte', () => {
    comMovimento(true);
    render(<Traco d="M0 10 L100 5" />);
    const linha = screen.getByTestId('linha');
    // Nada de dash: a linha não pode ficar pela metade para esse leitor.
    expect(linha.style.strokeDasharray).toBe('');
    expect(linha.style.strokeDashoffset).toBe('');
  });

  it('não quebra quando o navegador não sabe medir o traço', () => {
    // jsdom não implementa getTotalLength. Sem guarda, a tela inteira cairia.
    comMovimento(false);
    expect(() => render(<Traco d="M0 10 L100 5" />)).not.toThrow();
  });

  it('devolve uma ref utilizável', () => {
    comMovimento(false);
    render(<Traco d="M0 0 L10 10" />);
    expect(screen.getByTestId('linha')).toBeInTheDocument();
  });
});
