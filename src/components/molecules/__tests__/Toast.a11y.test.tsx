import React from 'react';
import { render, screen } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast — acessibilidade', () => {
  it('expõe nome acessível no botão de fechar', () => {
    render(
      <Toast id="t1" type="info" title="Salvo" onClose={jest.fn()} duration={0} />,
    );
    expect(
      screen.getByRole('button', { name: /fechar notificação/i }),
    ).toBeInTheDocument();
  });

  it('anuncia erros como alerta assertivo (role=alert)', () => {
    render(
      <Toast id="t2" type="error" title="Falhou" onClose={jest.fn()} duration={0} />,
    );
    const region = screen.getByRole('alert');
    expect(region).toHaveTextContent('Falhou');
  });

  it('anuncia avisos como alerta assertivo (role=alert)', () => {
    render(
      <Toast id="t3" type="warning" title="Atenção" onClose={jest.fn()} duration={0} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Atenção');
  });

  it('anuncia sucesso como status educado (role=status)', () => {
    render(
      <Toast id="t4" type="success" title="Pronto" onClose={jest.fn()} duration={0} />,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Pronto');
  });

  it('anuncia informações como status educado (role=status)', () => {
    render(
      <Toast id="t5" type="info" title="Dica" onClose={jest.fn()} duration={0} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Dica');
  });
});
