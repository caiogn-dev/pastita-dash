import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho composto `Dialog`/`DialogTitle` deve nomear o diálogo SOZINHO: hoje
// um consumidor que monta <Dialog><DialogTitle>…</DialogTitle></Dialog> sem
// passar `ariaLabelledby` à mão renderiza um role="dialog" SEM nome acessível
// (viola WCAG 4.1.2 / ARIA Dialog Pattern). Ligar DialogTitle↔Dialog por
// contexto corrige todos os consumidores compostos de uma vez.
describe('Dialog — nome acessível pelo DialogTitle (auto)', () => {
  it('usa o texto do DialogTitle como nome acessível do diálogo, sem props extras', () => {
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

    expect(
      screen.getByRole('dialog', { name: 'Login com WhatsApp' })
    ).toBeInTheDocument();
  });

  it('respeita ariaLabel explícito quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Confirmar exclusão">
        <DialogContent>
          <p>conteúdo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Confirmar exclusão' })
    ).toBeInTheDocument();
  });

  it('ariaLabelledby explícito tem precedência sobre o DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-externo">
        <DialogContent>
          <h2 id="titulo-externo">Título de fora</h2>
          <DialogHeader>
            <DialogTitle>Título interno</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título de fora' })
    ).toBeInTheDocument();
  });

  it('não cria referência pendente quando não há DialogTitle nem props de nome', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <p>sem título</p>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    // Sem título e sem props: não deve apontar aria-labelledby para um id inexistente.
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });
});
