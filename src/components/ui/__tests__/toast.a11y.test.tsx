import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast } from '../toast';

describe('Toast — acessibilidade do botão de fechar', () => {
  it('expõe nome acessível no botão icon-only de fechar', () => {
    render(
      <Toast id="t1" title="Salvo com sucesso" showProgress={false} />
    );
    // Leitores de tela precisam de um nome acessível; o botão só tem ícone.
    expect(
      screen.getByRole('button', { name: /fechar notificação/i })
    ).toBeInTheDocument();
  });

  it('dispara onClose ao clicar no botão de fechar', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <Toast id="t2" title="Erro" variant="error" showProgress={false} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar notificação/i }));
    // handleClose agenda o onClose após a animação (200ms)
    jest.advanceTimersByTime(250);
    expect(onClose).toHaveBeenCalledWith('t2');
    jest.useRealTimers();
  });
});
