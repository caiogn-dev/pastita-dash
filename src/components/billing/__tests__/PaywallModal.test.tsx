import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { PaywallModal } from '../PaywallModal';

function renderModal(props: { open: boolean; message: string; onClose: () => void }) {
  return render(
    <MemoryRouter>
      <PaywallModal {...props} />
    </MemoryRouter>,
  );
}

describe('PaywallModal', () => {
  it('não renderiza quando open=false', () => {
    renderModal({ open: false, message: 'x', onClose: () => {} });
    expect(screen.queryByText(/faça upgrade/i)).toBeNull();
  });

  it('mostra a mensagem e o CTA quando open=true', () => {
    renderModal({ open: true, message: 'Limite do plano atingido (50 produtos).', onClose: () => {} });
    expect(screen.getByText(/limite do plano atingido/i)).toBeTruthy();
    expect(screen.getByText(/ver planos/i)).toBeTruthy();
  });

  it('CTA aponta para /assinatura via Link', () => {
    renderModal({ open: true, message: 'msg', onClose: () => {} });
    const link = screen.getByRole('link', { name: /ver planos/i });
    expect(link).toHaveAttribute('href', '/assinatura');
  });

  it('chama onClose ao pressionar Escape', () => {
    const onClose = jest.fn();
    renderModal({ open: true, message: 'msg', onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no backdrop', () => {
    const onClose = jest.fn();
    renderModal({ open: true, message: 'msg', onClose });
    // O backdrop é o elemento com role="dialog"
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar "Agora não"', () => {
    const onClose = jest.fn();
    renderModal({ open: true, message: 'msg', onClose });
    fireEvent.click(screen.getByText(/agora não/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no CTA "Ver planos"', () => {
    const onClose = jest.fn();
    renderModal({ open: true, message: 'msg', onClose });
    fireEvent.click(screen.getByRole('link', { name: /ver planos/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
