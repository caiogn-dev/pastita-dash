import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../modal';

/**
 * Gestão de foco do Modal canônico (a11y de teclado):
 * - ao abrir, o foco entra no modal;
 * - Tab no último focável volta pro primeiro (e Shift+Tab no primeiro vai pro último);
 * - ao fechar, o foco volta pro elemento que estava focado antes de abrir.
 */
describe('Modal focus management', () => {
  function Harness({ open }: { open: boolean }) {
    return (
      <>
        <button data-testid="trigger">abrir</button>
        <Modal isOpen={open} onClose={() => {}} title="Teste" showCloseButton={false}>
          <button data-testid="first">primeiro</button>
          <button data-testid="last">último</button>
        </Modal>
      </>
    );
  }

  it('move o foco para dentro do modal ao abrir', () => {
    const { rerender } = render(<Harness open={false} />);
    screen.getByTestId('trigger').focus();
    rerender(<Harness open={true} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('prende Tab dentro do modal (wrap do último para o primeiro)', () => {
    render(<Harness open={true} />);
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('prende Shift+Tab dentro do modal (wrap do primeiro para o último)', () => {
    render(<Harness open={true} />);
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restaura o foco no elemento anterior ao fechar', () => {
    const { rerender } = render(<Harness open={false} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open={true} />);
    expect(trigger).not.toBe(document.activeElement);

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
