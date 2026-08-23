import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O `Dialog` composto (alias do Modal usado com DialogHeader/DialogTitle) não
// tinha `title` embutido, então cada consumidor precisava passar `ariaLabel`/
// `ariaLabelledby` à mão — e quem esquecia (ex.: WhatsAppAuthDialog) renderizava
// um role="dialog" SEM nome acessível, anunciado só como "diálogo" pelos leitores
// de tela (viola WCAG 4.1.2). Ligando `DialogTitle` ↔ `Dialog` por contexto, o
// título passa a nomear o diálogo automaticamente, sem trabalho do consumidor.
describe('Dialog — nome acessível automático via DialogTitle', () => {
  it('usa o texto do DialogTitle como nome acessível do diálogo (auto-wire)', () => {
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
          <h2 id="titulo-externo">Título externo</h2>
          {/* DialogTitle presente, mas o ariaLabelledby explícito vence */}
          <DialogTitle>Título ignorado</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título externo' })
    ).toBeInTheDocument();
  });

  it('um id explícito no DialogTitle não é sobrescrito pelo contexto', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="meu-id">
        <DialogContent>
          <DialogTitle id="meu-id">Título com id próprio</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título com id próprio' })
    ).toBeInTheDocument();
  });
});
