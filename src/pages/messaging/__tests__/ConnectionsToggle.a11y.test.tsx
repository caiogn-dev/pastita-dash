import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toggle } from '../Toggle';

describe('ConnectionsPage <Toggle> — acessibilidade', () => {
  it('expõe semântica de switch com nome e estado acessíveis', () => {
    render(<Toggle checked onChange={() => {}} label="Desativar conexão Loja Principal" />);
    const sw = screen.getByRole('switch', { name: 'Desativar conexão Loja Principal' });
    expect(sw).toBeInTheDocument();
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('reflete estado desmarcado e dispara onChange', () => {
    const onChange = jest.fn();
    render(<Toggle checked={false} onChange={onChange} label="Ativar conexão Loja Principal" />);
    const sw = screen.getByRole('switch', { name: 'Ativar conexão Loja Principal' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
