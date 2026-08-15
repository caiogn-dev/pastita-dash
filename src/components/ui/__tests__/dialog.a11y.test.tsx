import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho composto (Dialog + DialogTitle) precisa nomear o diálogo SOZINHO.
// Antes desta fatia, um <Dialog> com <DialogTitle> renderizava role="dialog"
// SEM aria-labelledby — o consumidor tinha de passar `ariaLabelledby` à mão,
// e o único consumidor real (WhatsAppAuthDialog) não passava: diálogo mudo,
// violando WCAG 4.1.2. Ligar DialogTitle↔Dialog via contexto conserta todos os
// diálogos compostos de uma vez.
describe('Dialog — nome acessível automático via DialogTitle', () => {
  it('usa o DialogTitle como nome acessível sem precisar de ariaLabelledby', () => {
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

  it('respeita ariaLabelledby explícito do consumidor (precedência)', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="meu-heading">
        <DialogContent>
          <h2 id="meu-heading">Título próprio</h2>
          <DialogTitle>Outro texto</DialogTitle>
          <p>corpo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título próprio' })
    ).toBeInTheDocument();
  });

  it('cai para ariaLabel quando não há DialogTitle', () => {
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

  // Regressão (review Codex, P2): se o `DialogTitle` deixa de existir, o registro
  // precisa ser desfeito, senão o diálogo ficaria com `aria-labelledby` apontando
  // para um id inexistente e suprimiria o fallback `ariaLabel` — diálogo sem nome.
  it('volta ao ariaLabel quando o DialogTitle é removido em runtime', () => {
    const Harness: React.FC = () => {
      const [showTitle, setShowTitle] = useState(true);
      return (
        <>
          <button onClick={() => setShowTitle(false)}>ocultar</button>
          <Dialog open onOpenChange={() => {}} ariaLabel="Nome de reserva">
            <DialogContent>
              {showTitle && <DialogTitle>Título temporário</DialogTitle>}
              <p>corpo</p>
            </DialogContent>
          </Dialog>
        </>
      );
    };

    render(<Harness />);
    // Com título presente, ele nomeia o diálogo.
    expect(
      screen.getByRole('dialog', { name: 'Título temporário' })
    ).toBeInTheDocument();

    // Remove o título → o diálogo NÃO pode ficar mudo: cai no ariaLabel.
    act(() => {
      screen.getByText('ocultar').click();
    });
    expect(
      screen.getByRole('dialog', { name: 'Nome de reserva' })
    ).toBeInTheDocument();
  });
});
