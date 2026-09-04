import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho composto do `Dialog` (usado por WhatsAppAuthDialog e afins) monta o
// cabeçalho com `<DialogTitle>`, mas o `Dialog` renderiza um `role="dialog"` sem
// `aria-labelledby` — o heading existe na tela mas não nomeia o diálogo. Leitores
// de tela anunciam só "diálogo". Ligar `DialogTitle`↔`Dialog` via contexto faz o
// diálogo se nomear sozinho pelo seu título, sem o consumidor passar nada à mão.
describe('Dialog — nome acessível automático via DialogTitle', () => {
  it('nomeia o diálogo pelo DialogTitle sem props manuais', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login com WhatsApp</DialogTitle>
          </DialogHeader>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    // getByRole resolve o nome via aria-labelledby → texto do DialogTitle.
    expect(
      screen.getByRole('dialog', { name: 'Login com WhatsApp' })
    ).toBeInTheDocument();
  });

  it('respeita ariaLabelledby explícito no Dialog (precede o DialogTitle)', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-externo">
        <DialogContent>
          <h2 id="titulo-externo">Título externo</h2>
          <DialogTitle>Título interno</DialogTitle>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título externo' })
    ).toBeInTheDocument();
  });

  it('usa ariaLabel do Dialog quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Autenticação">
        <DialogContent>
          <p>sem título</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Autenticação' })
    ).toBeInTheDocument();
  });

  it('respeita id explícito no DialogTitle e nomeia o diálogo por ele', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle id="meu-titulo">Título com id próprio</DialogTitle>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Título com id próprio',
    });
    expect(dialog).toHaveAttribute('aria-labelledby', 'meu-titulo');
  });
});
