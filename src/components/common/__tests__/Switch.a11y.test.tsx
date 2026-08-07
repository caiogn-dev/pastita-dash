import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../Switch';

describe('Switch — nome acessível (a11y)', () => {
  it('expõe o texto de `label` como nome acessível do switch', () => {
    render(<Switch checked={false} onChange={() => {}} label="Cardápio" />);
    // getByRole com {name} falha se o controle não tiver nome acessível
    expect(screen.getByRole('switch', { name: 'Cardápio' })).toBeInTheDocument();
  });

  it('associa o nome via `aria-labelledby` a um rótulo externo', () => {
    render(
      <>
        <span id="bot-label">Aceitar pedidos pelo bot</span>
        <Switch checked aria-labelledby="bot-label" onChange={() => {}} />
      </>
    );
    expect(
      screen.getByRole('switch', { name: 'Aceitar pedidos pelo bot' })
    ).toBeInTheDocument();
  });

  it('reflete o estado em `aria-checked`', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} label="Ativo" />
    );
    expect(screen.getByRole('switch', { name: 'Ativo' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    rerender(<Switch checked onChange={() => {}} label="Ativo" />);
    expect(screen.getByRole('switch', { name: 'Ativo' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('chama onChange com o valor invertido ao clicar', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} label="Ativo" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Ativo' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('não dispara onChange quando desabilitado', () => {
    const onChange = jest.fn();
    render(
      <Switch checked={false} onChange={onChange} label="Ativo" disabled />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Ativo' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
