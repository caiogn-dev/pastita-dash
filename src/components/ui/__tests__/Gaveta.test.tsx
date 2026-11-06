import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Gaveta } from '../Gaveta';
import { Modal } from '../modal';

describe('Gaveta', () => {
  it('é um diálogo modal com nome acessível', () => {
    render(<Gaveta ariaLabel="Editar pedido" onClose={jest.fn()}><button>Salvar</button></Gaveta>);
    const d = screen.getByRole('dialog', { name: 'Editar pedido' });
    expect(d).toHaveAttribute('aria-modal', 'true');
  });

  it('Esc fecha a gaveta e foca o primeiro controle ao abrir', () => {
    const onClose = jest.fn();
    render(<Gaveta ariaLabel="Ficha" onClose={onClose}><button>Primeiro</button><button>Segundo</button></Gaveta>);
    expect(screen.getByText('Primeiro')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicar no fundo fecha', () => {
    const onClose = jest.fn();
    render(<Gaveta ariaLabel="Ficha" onClose={onClose}><button>x</button></Gaveta>);
    fireEvent.click(screen.getByTestId('gaveta-fundo'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab fica preso dentro da gaveta', () => {
    render(<Gaveta ariaLabel="Ficha" onClose={jest.fn()}><button>A</button><button>B</button></Gaveta>);
    screen.getByText('B').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByText('A')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('B')).toHaveFocus();
  });

  it('devolve o foco a quem abriu ao fechar', () => {
    const Host = () => {
      const [aberta, setAberta] = useState(false);
      return (
        <>
          <button onClick={() => setAberta(true)}>Abrir</button>
          {aberta && <Gaveta ariaLabel="Ficha" onClose={() => setAberta(false)}><button>Dentro</button></Gaveta>}
        </>
      );
    };
    render(<Host />);
    screen.getByText('Abrir').focus();
    fireEvent.click(screen.getByText('Abrir'));
    expect(screen.getByText('Dentro')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Abrir')).toHaveFocus();
  });

  describe('com um modal por cima (ex.: confirmar exclusão)', () => {
    const Host = ({ onCloseGaveta, onCloseModal }: { onCloseGaveta: () => void; onCloseModal: () => void }) => (
      <>
        <Gaveta ariaLabel="Ficha" onClose={onCloseGaveta}><button>Excluir</button></Gaveta>
        <Modal open onClose={onCloseModal} title="Excluir cliente"><button>Confirmar</button></Modal>
      </>
    );

    it('Esc fecha só o modal, não a gaveta de baixo', () => {
      const g = jest.fn(); const m = jest.fn();
      render(<Host onCloseGaveta={g} onCloseModal={m} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(m).toHaveBeenCalledTimes(1);
      expect(g).not.toHaveBeenCalled();
    });

    it('Tab não é puxado para dentro da gaveta de baixo', () => {
      render(<Host onCloseGaveta={jest.fn()} onCloseModal={jest.fn()} />);
      const confirmar = screen.getByText('Confirmar');
      confirmar.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      // o trap do modal (único elemento focável) mantém o foco nele
      expect(screen.getByText('Excluir')).not.toHaveFocus();
    });

    it('depois que o modal fecha, Esc volta a fechar a gaveta', () => {
      const g = jest.fn();
      const Wrap = () => {
        const [m, setM] = useState(true);
        return (
          <>
            <Gaveta ariaLabel="Ficha" onClose={g}><button>Excluir</button></Gaveta>
            <Modal open={m} onClose={() => setM(false)} title="Excluir cliente"><button>Confirmar</button></Modal>
          </>
        );
      };
      render(<Wrap />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(g).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(g).toHaveBeenCalledTimes(1);
    });
  });
});
