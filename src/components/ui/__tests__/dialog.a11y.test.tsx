import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O `Dialog` composto (Dialog + DialogTitle) renderiza um role="dialog" via
// Modal. Sem aria-labelledby/aria-label o diálogo fica ANÔNIMO — leitores de
// tela anunciam só "diálogo". Aqui o `DialogTitle` deve nomear automaticamente
// o `Dialog` que o contém (WCAG 4.1.2), sem o consumidor precisar fiar o id à
// mão.
describe('Dialog composto — nome acessível automático via DialogTitle', () => {
  it('nomeia o diálogo pelo texto do DialogTitle, sem props extras', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Conectar WhatsApp' })
    ).toBeInTheDocument();
  });

  it('respeita ariaLabelledby explícito no Dialog (precedência sobre o DialogTitle)', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-custom">
        <DialogContent>
          <h2 id="titulo-custom">Título escolhido à mão</h2>
          <DialogTitle>Outro texto</DialogTitle>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título escolhido à mão' })
    ).toBeInTheDocument();
  });

  it('usa ariaLabel quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Diálogo sem título">
        <DialogContent>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Diálogo sem título' })
    ).toBeInTheDocument();
  });
});
