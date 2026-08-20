import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho COMPOSTO (Dialog + DialogTitle) precisava, até aqui, que cada
// consumidor passasse `ariaLabelledby` à mão para o diálogo ter nome acessível.
// Quem esquecia (ex.: WhatsAppAuthDialog) renderizava um role="dialog" mudo —
// leitores de tela anunciavam só "diálogo". Ligar DialogTitle↔Dialog por contexto
// nomeia AUTOMATICAMENTE todo diálogo composto que tenha um DialogTitle.
describe('Dialog composto — nome acessível automático via DialogTitle', () => {
  it('usa o texto do DialogTitle como nome acessível do diálogo', () => {
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

    // Resolve o nome via aria-labelledby → id gerado no <h2> do DialogTitle.
    expect(
      screen.getByRole('dialog', { name: 'Login com WhatsApp' })
    ).toBeInTheDocument();
  });

  it('preserva o texto do título mesmo com ícone/markup ao lado', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>
            <span aria-hidden="true">🟢</span> Confirmar exclusão
          </DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Confirmar exclusão' })
    ).toBeInTheDocument();
  });

  it('respeita ariaLabelledby explícito do Dialog em vez do DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-externo">
        <DialogContent>
          <h2 id="titulo-externo">Título escolhido pelo consumidor</h2>
          <DialogTitle>Título do DialogTitle</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título escolhido pelo consumidor' })
    ).toBeInTheDocument();
  });

  it('cai para ariaLabel quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Diálogo sem título visível">
        <DialogContent>
          <p>só conteúdo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Diálogo sem título visível' })
    ).toBeInTheDocument();
  });
});
