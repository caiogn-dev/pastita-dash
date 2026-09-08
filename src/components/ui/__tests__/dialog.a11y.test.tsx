import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O `Dialog` (alias composto do `Modal`) renderiza `role="dialog"` +
// `aria-modal`. Quando o consumidor monta o cabeçalho com `DialogTitle`, o
// diálogo precisa herdar esse título como NOME ACESSÍVEL automaticamente —
// sem o consumidor ter que passar `ariaLabelledby` à mão e casar ids. Sem
// isso, leitores de tela anunciam só "diálogo" (ex.: WhatsAppAuthDialog).
describe('Dialog — nome acessível a partir do DialogTitle', () => {
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

    expect(
      screen.getByRole('dialog', { name: 'Login com WhatsApp' })
    ).toBeInTheDocument();
  });

  it('respeita ariaLabelledby explícito no Dialog (precedência sobre o DialogTitle)', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-proprio">
        <DialogContent>
          <h2 id="titulo-proprio">Título dono</h2>
          <DialogTitle>Ignorado</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título dono' })
    ).toBeInTheDocument();
  });

  it('aceita ariaLabel explícito quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Sessão de autenticação">
        <DialogContent>
          <p>conteúdo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Sessão de autenticação' })
    ).toBeInTheDocument();
  });

  it('não inventa nome (nem aria-labelledby órfão) quando não há título algum', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <p>conteúdo sem título</p>
        </DialogContent>
      </Dialog>
    );

    // Existe o diálogo, mas sem nome acessível — e crucialmente sem
    // aria-labelledby apontando para um id inexistente (o que zeraria o nome
    // e ainda confundiria alguns leitores).
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });
});
