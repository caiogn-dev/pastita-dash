import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../dialog';

// O caminho composto (ui/dialog) monta o diálogo com <DialogTitle> visível, mas
// até aqui o heading NÃO era ligado ao role="dialog": a menos que o consumidor
// passasse aria-labelledby à mão, o diálogo era anunciado só como "diálogo".
// O DialogTitle deve nomear automaticamente o Dialog que o contém (WCAG 4.1.2 /
// ARIA Dialog Pattern), sem cada consumidor ter que refazer o fio à mão.
describe('Dialog — nome acessível automático via DialogTitle', () => {
  it('usa o texto do DialogTitle como nome acessível do diálogo', () => {
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

  it('aria-labelledby explícito tem precedência sobre o DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabelledby="titulo-externo">
        <h2 id="titulo-externo">Título externo</h2>
        <DialogContent>
          <DialogTitle>Título interno</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Título externo' })
    ).toBeInTheDocument();
  });

  it('aceita aria-label explícito quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}} ariaLabel="Diálogo sem título">
        <DialogContent>
          <p>conteúdo</p>
        </DialogContent>
      </Dialog>
    );

    expect(
      screen.getByRole('dialog', { name: 'Diálogo sem título' })
    ).toBeInTheDocument();
  });

  it('já tem nome acessível no instante em que o foco entra ao abrir', () => {
    // Ao abrir, o Modal move o foco para dentro do diálogo. Nesse instante o
    // diálogo PRECISA já ter nome acessível — senão o leitor de tela anuncia um
    // diálogo sem nome. Este teste captura o estado do DOM no exato momento do
    // primeiro `focusin` (o foco que o Modal move para dentro).
    let nameAtFocusTime: string | null = null;
    const onFocusIn = () => {
      if (nameAtFocusTime !== null) return; // só o primeiro foco (o de abertura)
      const dialog = document.querySelector('[role="dialog"]');
      const labelledBy = dialog?.getAttribute('aria-labelledby');
      const target = labelledBy ? document.getElementById(labelledBy) : null;
      nameAtFocusTime = target?.textContent ?? '';
    };
    document.addEventListener('focusin', onFocusIn);
    try {
      render(
        <Dialog open onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar WhatsApp</DialogTitle>
            </DialogHeader>
            <button type="button">Continuar</button>
          </DialogContent>
        </Dialog>
      );
    } finally {
      document.removeEventListener('focusin', onFocusIn);
    }

    expect(nameAtFocusTime).toBe('Conectar WhatsApp');
  });

  it('não deixa aria-labelledby pendurado (dangling) quando não há DialogTitle', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <p>conteúdo</p>
        </DialogContent>
      </Dialog>
    );

    // Sem título e sem aria-label, o diálogo não tem nome — mas o que NÃO pode
    // acontecer é apontar aria-labelledby para um id inexistente.
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    if (labelledBy) {
      expect(document.getElementById(labelledBy)).not.toBeNull();
    }
  });
});
