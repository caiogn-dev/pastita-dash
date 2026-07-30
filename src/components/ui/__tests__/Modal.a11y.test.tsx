import React from 'react';
import { render, screen } from '@testing-library/react';
import { Modal, ConfirmModal } from '../modal';

/**
 * Nome acessível do Modal canônico (a11y).
 *
 * Um `role="dialog"` / `aria-modal` SEM nome acessível é anunciado apenas como
 * "diálogo" por leitores de tela — o usuário não sabe do que se trata. O WAI-ARIA
 * exige que todo dialog tenha nome via `aria-labelledby` (preferido) ou `aria-label`.
 *
 * Como o Modal é a fonte única de todos os modais do painel (OrderDetailModal,
 * PaywallModal, ComboModal, diálogos de confirmação via useConfirm, etc.), nomear
 * o dialog aqui conserta o app inteiro de uma vez.
 */
describe('Modal — nome acessível (aria-labelledby / aria-label)', () => {
  it('associa o título embutido ao dialog via aria-labelledby', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Editar pedido">
        <p>corpo</p>
      </Modal>,
    );
    // getByRole computa o nome acessível a partir de aria-labelledby.
    expect(screen.getByRole('dialog', { name: 'Editar pedido' })).toBeInTheDocument();
  });

  it('usa a prop ariaLabel quando não há título embutido (caminho composto)', () => {
    render(
      <Modal isOpen onClose={() => {}} ariaLabel="Confirmar conexão">
        <div>conteúdo customizado</div>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirmar conexão' })).toBeInTheDocument();
  });

  it('dá nome acessível ao ConfirmModal a partir do seu título', () => {
    render(
      <ConfirmModal
        isOpen
        title="Excluir conta?"
        message="Esta ação não pode ser desfeita."
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Excluir conta?' })).toBeInTheDocument();
  });
});
