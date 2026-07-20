/**
 * Toast — acessibilidade (a11y).
 *
 * O toast é o mecanismo de notificação usado em todo o painel (via ToastContext).
 * Duas lacunas de acessibilidade eram corrigidas aqui:
 *  1. O botão de fechar era icon-only (apenas <XMarkIcon>) sem nome acessível —
 *     leitores de tela não anunciavam nada e não havia como acioná-lo por voz.
 *  2. O toast não era uma live region — leitores de tela não anunciavam a
 *     notificação quando ela aparecia. Erros devem interromper (role="alert" /
 *     aria-live="assertive"); os demais são educados (role="status" /
 *     aria-live="polite").
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast — acessibilidade', () => {
  it('expõe nome acessível no botão de fechar', () => {
    const onClose = jest.fn();
    render(<Toast id="t1" type="info" title="Salvo" duration={0} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /fechar notificação/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute('type', 'button');

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledWith('t1');
  });

  it('toast de erro é uma live region assertiva (role="alert")', () => {
    render(<Toast id="e1" type="error" title="Falhou" duration={0} onClose={jest.fn()} />);

    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toHaveTextContent('Falhou');
  });

  it('toast de sucesso/info é uma live region educada (role="status")', () => {
    render(<Toast id="s1" type="success" title="Pronto" duration={0} onClose={jest.fn()} />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Pronto');
  });
});
