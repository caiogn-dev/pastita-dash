import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../Switch';

describe('Switch — nome acessível (a11y)', () => {
  it('expõe role="switch" e reflete o estado em aria-checked', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos" />
    );
    const sw = screen.getByRole('switch', { name: 'Aceitar pedidos' });
    expect(sw).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked onChange={() => {}} aria-label="Aceitar pedidos" />);
    expect(screen.getByRole('switch', { name: 'Aceitar pedidos' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('recebe nome acessível via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="Ativar Cardápio" />);
    expect(screen.getByRole('switch', { name: 'Ativar Cardápio' })).toBeInTheDocument();
  });

  it('recebe nome acessível via aria-labelledby apontando para um rótulo visível', () => {
    render(
      <div>
        <span id="rotulo-bot">Aceitar pedidos pelo bot</span>
        <Switch checked onChange={() => {}} aria-labelledby="rotulo-bot" />
      </div>
    );
    expect(
      screen.getByRole('switch', { name: 'Aceitar pedidos pelo bot' })
    ).toBeInTheDocument();
  });

  it('dispara onChange com o valor negado ao clicar', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Alternar" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Alternar' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('propaga o id para o elemento (permite associação externa)', () => {
    render(<Switch id="meu-switch" checked={false} onChange={() => {}} aria-label="X" />);
    expect(screen.getByRole('switch', { name: 'X' })).toHaveAttribute('id', 'meu-switch');
  });
});
