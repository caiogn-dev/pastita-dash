import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '../Switch';

// O Switch é um <button role="switch"> sem texto interno: sem um nome acessível
// explícito, leitores de tela anunciam apenas "switch, marcado" — o usuário não
// sabe o que está sendo alternado. Estes testes travam o contrato de nome acessível.
describe('Switch — nome acessível (a11y)', () => {
  it('expõe nome acessível via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos pelo bot" />);
    // getByRole com name só encontra se o switch tiver nome acessível.
    expect(screen.getByRole('switch', { name: 'Aceitar pedidos pelo bot' })).toBeInTheDocument();
  });

  it('expõe nome acessível via aria-labelledby', () => {
    render(
      <>
        <span id="rotulo-bot">Aceitar pedidos pelo bot</span>
        <Switch checked onChange={() => {}} aria-labelledby="rotulo-bot" />
      </>
    );
    expect(screen.getByRole('switch', { name: 'Aceitar pedidos pelo bot' })).toBeInTheDocument();
  });

  it('reflete o estado marcado em aria-checked', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} aria-label="Ativar" />
    );
    expect(screen.getByRole('switch', { name: 'Ativar' })).toHaveAttribute('aria-checked', 'false');
    rerender(<Switch checked onChange={() => {}} aria-label="Ativar" />);
    expect(screen.getByRole('switch', { name: 'Ativar' })).toHaveAttribute('aria-checked', 'true');
  });

  it('dispara onChange com o valor alternado ao clicar', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Ativar" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Ativar' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
