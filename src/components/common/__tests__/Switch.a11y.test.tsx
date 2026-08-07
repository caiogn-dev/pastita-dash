import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../Switch';

describe('Switch — acessibilidade', () => {
  it('expõe role="switch" e reflete o estado em aria-checked', () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos" />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked onChange={() => {}} aria-label="Aceitar pedidos" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('recebe nome acessível via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos pelo bot" />);
    expect(screen.getByRole('switch', { name: 'Aceitar pedidos pelo bot' })).toBeInTheDocument();
  });

  it('recebe nome acessível via aria-labelledby', () => {
    render(
      <>
        <span id="sw-label">Cardápio visível</span>
        <Switch checked onChange={() => {}} aria-labelledby="sw-label" />
      </>
    );
    expect(screen.getByRole('switch', { name: 'Cardápio visível' })).toBeInTheDocument();
  });

  it('dispara onChange com o valor invertido ao clicar', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Aceitar pedidos" />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
