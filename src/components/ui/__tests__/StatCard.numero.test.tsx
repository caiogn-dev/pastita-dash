import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

// O número de dinheiro é o que o dono procura primeiro. Subindo de zero, ele
// diz "isto é de hoje e ainda está andando" — informação, não enfeite.
// A API é ADITIVA: quem não passa o número cru continua vendo o texto pronto.

const semMovimento = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({
      matches: q.includes('reduce'), media: q,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false, onchange: null,
    }),
  });
};

describe('valor do StatCard', () => {
  beforeEach(semMovimento);

  it('sem o número cru, mostra o texto como sempre', () => {
    render(<StatCard label="Receita" value="R$ 305,62" />);
    expect(screen.getByText('R$ 305,62')).toBeInTheDocument();
  });

  it('com o número cru, quem manda é o formatador do card', () => {
    // Formatador propositalmente diferente do `value`, para o teste conseguir
    // distinguir quem escreveu na tela.
    render(
      <StatCard
        label="Receita"
        value="texto antigo"
        valorAnimado={305.62}
        formatarValor={(n) => `>> ${n.toFixed(2)} <<`}
      />,
    );
    expect(screen.getByText('>> 305.62 <<')).toBeInTheDocument();
    expect(screen.queryByText('texto antigo')).not.toBeInTheDocument();
  });

  it('o número cru sozinho não basta — sem formatador, mantém o texto', () => {
    render(<StatCard label="Receita" value="R$ 305,62" valorAnimado={305.62} />);
    expect(screen.getByText('R$ 305,62')).toBeInTheDocument();
  });
});
