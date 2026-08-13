import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho COMPOSTO (ui/dialog.tsx) deixava os diálogos mudos: consumidores
// montavam <Dialog><DialogTitle>… mas o <DialogTitle> não nomeava o diálogo
// sozinho — era preciso passar `ariaLabelledby` à mão (e ninguém passava).
// Aqui o DialogTitle se auto-registra no Dialog via contexto, de modo que
// qualquer diálogo com título ganha nome acessível de graça (ARIA Dialog
// Pattern: um role="dialog" sem nome é anunciado só como "diálogo").
describe('Dialog — nome acessível automático via DialogTitle', () => {
  it('usa o texto do DialogTitle como nome acessível sem configuração extra', () => {
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

  it('respeita `ariaLabelledby` explícito no Dialog (tem precedência sobre o título auto-registrado)', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-externo">
        <h2 id="titulo-externo">Título escolhido à mão</h2>
        <DialogContent>
          <DialogTitle>Título ignorado para o nome</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título escolhido à mão' })
    ).toBeInTheDocument();
  });

  it('cai para `ariaLabel` quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Confirmação">
        <DialogContent>
          <p>sem título</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Confirmação' })
    ).toBeInTheDocument();
  });

  it('preserva um `id` explícito no DialogTitle e ainda nomeia o diálogo por ele', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle id="meu-titulo">Título com id próprio</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const heading = screen.getByText('Título com id próprio');
    expect(heading).toHaveAttribute('id', 'meu-titulo');
    expect(
      screen.getByRole('dialog', { name: 'Título com id próprio' })
    ).toBeInTheDocument();
  });
});
