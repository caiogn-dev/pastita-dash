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

  it('vincula o aria-labelledby ao id do heading no mesmo render (sem effect/round-trip)', () => {
    // O vínculo precisa existir já no commit inicial: o Modal move o foco para
    // dentro do painel ao abrir, e um aria-labelledby que só aparece depois de
    // um effect + re-render deixaria o leitor de tela anunciar um diálogo sem
    // nome. Aqui o id do heading e o aria-labelledby do diálogo são o mesmo id
    // estável gerado pelo Dialog.
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Título estável</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
    expect(screen.getByText('Título estável').id).toBe(labelledby);
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
