import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast } from '../Toast';

describe('Toast (acessibilidade)', () => {
  it('o botão de fechar tem nome acessível anunciável por leitores de tela', () => {
    render(
      <Toast id="t1" type="info" title="Salvo" duration={0} onClose={() => {}} />
    );
    // Sem aria-label, um botão só-ícone não é anunciado. Deve ter nome acessível.
    const closeBtn = screen.getByRole('button', { name: /fechar notificaç/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it('fechar dispara onClose com o id do toast', () => {
    const onClose = jest.fn();
    render(
      <Toast id="abc" type="success" title="Feito" duration={0} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar notificaç/i }));
    expect(onClose).toHaveBeenCalledWith('abc');
  });

  it('toasts de erro usam role="alert" (aria-live assertivo) para anúncio imediato', () => {
    render(
      <Toast id="e1" type="error" title="Falha ao salvar" duration={0} onClose={() => {}} />
    );
    const region = screen.getByRole('alert');
    expect(region).toHaveTextContent('Falha ao salvar');
  });

  it('toasts informativos/de sucesso usam role="status" (aria-live polido)', () => {
    render(
      <Toast id="s1" type="success" title="Pedido criado" duration={0} onClose={() => {}} />
    );
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Pedido criado');
  });
});
