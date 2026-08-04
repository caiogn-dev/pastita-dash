import React from 'react';
import { render, screen } from '@testing-library/react';
import { Switch } from '../Switch';

// O Switch compartilhado renderiza <button role="switch"> com aria-checked, mas
// sem nome acessível: um <label> que apenas envolve o botão NÃO nomeia um
// role="switch". Leitores de tela anunciavam "alternar" sem dizer O QUÊ é
// alternado. Precisa aceitar aria-label / aria-labelledby e propagá-los.
describe('Switch — acessibilidade (nome acessível)', () => {
  it('expõe nome acessível via aria-label', () => {
    render(
      <Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos pelo bot" />
    );

    const control = screen.getByRole('switch', { name: /aceitar pedidos pelo bot/i });
    expect(control).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-checked', 'false');
  });

  it('expõe nome acessível via aria-labelledby', () => {
    render(
      <div>
        <span id="lbl-menu">Cardápio</span>
        <Switch checked onChange={() => {}} aria-labelledby="lbl-menu" />
      </div>
    );

    const control = screen.getByRole('switch', { name: /cardápio/i });
    expect(control).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-checked', 'true');
  });
});
