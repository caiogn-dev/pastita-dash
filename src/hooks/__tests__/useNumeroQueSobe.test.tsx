import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useNumeroQueSobe } from '../useNumeroQueSobe';

/**
 * "R$ 305,62" aparecendo pronto e "R$ 305,62" subindo de zero contam coisas
 * diferentes: a segunda diz que o número é de HOJE e ainda está andando. É a
 * única animação do painel que carrega informação em vez de enfeite.
 *
 * Nem CSS nem framer-motion interpolam número — por isso anime.js entra aqui.
 *
 * Duas regras inegociáveis:
 *  - quem pede menos movimento no sistema recebe o valor final, sem animação;
 *  - o valor final é SEMPRE o valor real, nunca um arredondamento da animação.
 */

const Mostrador = ({ valor }: { valor: number }) => {
  const ref = useNumeroQueSobe<HTMLSpanElement>(valor, (n) => `R$ ${n.toFixed(2)}`);
  return <span data-testid="n" ref={ref} />;
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

describe('número que sobe', () => {
  it('quem pede menos movimento vê o valor final na hora', () => {
    comMovimento(true);
    render(<Mostrador valor={305.62} />);
    expect(screen.getByTestId('n')).toHaveTextContent('R$ 305.62');
  });

  it('sem animação nenhuma, ainda assim o número aparece', () => {
    // Um valor que nunca é exibido é pior do que um valor sem graça.
    comMovimento(true);
    render(<Mostrador valor={0} />);
    expect(screen.getByTestId('n')).toHaveTextContent('R$ 0.00');
  });

  it('termina exatamente no valor real, não no arredondado da animação', async () => {
    comMovimento(false);
    render(<Mostrador valor={1234.56} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });
    expect(screen.getByTestId('n')).toHaveTextContent('R$ 1234.56');
  });

  it('acompanha quando o valor muda depois', async () => {
    comMovimento(true);
    const { rerender } = render(<Mostrador valor={10} />);
    rerender(<Mostrador valor={99.9} />);
    expect(screen.getByTestId('n')).toHaveTextContent('R$ 99.90');
  });

  it('aguenta valor inválido sem quebrar a tela', () => {
    comMovimento(true);
    render(<Mostrador valor={NaN} />);
    expect(screen.getByTestId('n')).toHaveTextContent('R$ 0.00');
  });
});
