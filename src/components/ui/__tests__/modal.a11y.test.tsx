import React from 'react';
import { render, screen } from '@testing-library/react';
import { Modal, ConfirmModal } from '../modal';

// Um diálogo modal precisa de NOME ACESSÍVEL: com role="dialog" + aria-modal
// mas sem aria-labelledby/aria-label, leitores de tela anunciam só "diálogo",
// sem dizer do que se trata. Como o Modal é a fonte única de todos os modais do
// painel, dar-lhe nome acessível corrige o app inteiro de uma vez.
describe('Modal — nome acessível do diálogo', () => {
  it('usa o título embutido como nome acessível (aria-labelledby)', () => {
    render(
      <Modal open onClose={() => {}} title="Editar produto">
        <p>corpo</p>
      </Modal>
    );

    // getByRole resolve o nome via aria-labelledby → texto do heading.
    expect(
      screen.getByRole('dialog', { name: 'Editar produto' })
    ).toBeInTheDocument();
  });

  it('aceita aria-label explícito quando não há título embutido', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Pré-visualização do cardápio">
        <p>conteúdo</p>
      </Modal>
    );

    expect(
      screen.getByRole('dialog', { name: 'Pré-visualização do cardápio' })
    ).toBeInTheDocument();
  });

  it('aceita aria-labelledby explícito apontando para um heading próprio (caminho composto)', () => {
    render(
      <Modal open onClose={() => {}} ariaLabelledby="meu-titulo">
        <h2 id="meu-titulo">Título composto</h2>
        <p>conteúdo</p>
      </Modal>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título composto' })
    ).toBeInTheDocument();
  });

  it('ConfirmModal nomeia o diálogo pelo seu próprio título', () => {
    render(
      <ConfirmModal
        open
        title="Excluir conta?"
        message="Essa ação não pode ser desfeita."
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );

    expect(
      screen.getByRole('dialog', { name: 'Excluir conta?' })
    ).toBeInTheDocument();
  });
});
