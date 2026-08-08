import React from 'react';
import { render, screen } from '@testing-library/react';
import { Switch } from '../Switch';

// O Switch compartilhado usa role="switch" + aria-checked, mas sem nome
// acessível o leitor de tela anuncia apenas "alternância, ligada/desligada"
// sem dizer O QUE está sendo alternado (viola WCAG 4.1.2 Name, Role, Value).
describe('Switch — nome acessível', () => {
  it('expõe nome acessível via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} ariaLabel="Aceitar pedidos pelo bot" />);
    expect(
      screen.getByRole('switch', { name: /aceitar pedidos pelo bot/i })
    ).toBeInTheDocument();
  });

  it('expõe nome acessível via aria-labelledby', () => {
    render(
      <>
        <span id="rotulo-switch">Cardápio</span>
        <Switch checked onChange={() => {}} ariaLabelledby="rotulo-switch" />
      </>
    );
    expect(screen.getByRole('switch', { name: /cardápio/i })).toBeInTheDocument();
  });

  it('mantém o estado em aria-checked', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} ariaLabel="X" />
    );
    expect(screen.getByRole('switch', { name: 'X' })).toHaveAttribute('aria-checked', 'false');
    rerender(<Switch checked onChange={() => {}} ariaLabel="X" />);
    expect(screen.getByRole('switch', { name: 'X' })).toHaveAttribute('aria-checked', 'true');
  });
});
