import React from 'react';
import { render, screen } from '@testing-library/react';
import { Modal } from '../modal';

/**
 * Nome acessível do diálogo (WCAG 4.1.2 — Name, Role, Value).
 *
 * O container com `role="dialog"`/`aria-modal="true"` precisa ter um NOME
 * acessível, senão leitores de tela anunciam apenas "diálogo" sem contexto.
 * - Com `title`: o nome vem do `<h2>` do cabeçalho via `aria-labelledby`.
 * - Sem `title` (modo composto): o consumidor informa `ariaLabel`.
 */
describe('Modal — nome acessível do diálogo', () => {
  it('usa o title como nome acessível (aria-labelledby → h2)', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Editar conta">
        <p>corpo</p>
      </Modal>
    );
    // getByRole com `name` só encontra se o diálogo tiver nome acessível.
    expect(screen.getByRole('dialog', { name: 'Editar conta' })).toBeInTheDocument();
  });

  it('aceita ariaLabel explícito quando não há title (modo composto)', () => {
    render(
      <Modal isOpen onClose={() => {}} ariaLabel="Detalhes do pedido">
        <p>corpo composto</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Detalhes do pedido' })).toBeInTheDocument();
  });

  it('mantém role=dialog e aria-modal (regressão)', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Qualquer">
        <p>corpo</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
