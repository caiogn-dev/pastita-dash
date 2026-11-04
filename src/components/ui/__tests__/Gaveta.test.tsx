import { render, screen, fireEvent } from '@testing-library/react';
import { Gaveta } from '../Gaveta';

const Cena = ({ onClose }: { onClose: () => void }) => (
  <>
    <button>Abrir</button>
    <Gaveta rotulo="Editar cliente" onClose={onClose} larguraMax="max-w-md">
      <input aria-label="Nome" />
      <button>Salvar</button>
    </Gaveta>
  </>
);

describe('Gaveta', () => {
  it('é um diálogo modal com nome', () => {
    render(<Cena onClose={jest.fn()} />);
    const d = screen.getByRole('dialog', { name: 'Editar cliente' });
    expect(d).toHaveAttribute('aria-modal', 'true');
  });

  it('Esc fecha', () => {
    const onClose = jest.fn();
    render(<Cena onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clique no fundo fecha, clique dentro não', () => {
    const onClose = jest.fn();
    render(<Cena onClose={onClose} />);
    fireEvent.click(screen.getByText('Salvar'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('gaveta-fundo'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('foca o primeiro campo e prende o Tab', () => {
    render(<Cena onClose={jest.fn()} />);
    const nome = screen.getByLabelText('Nome');
    expect(nome).toHaveFocus();
    screen.getByText('Salvar').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(nome).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Salvar')).toHaveFocus();
  });

  it('devolve o foco a quem abriu ao desmontar', () => {
    const { rerender } = render(<button>Abrir</button>);
    screen.getByText('Abrir').focus();
    rerender(<><button>Abrir</button><Gaveta rotulo="X" onClose={jest.fn()}><button>Dentro</button></Gaveta></>);
    expect(screen.getByText('Dentro')).toHaveFocus();
    rerender(<button>Abrir</button>);
    expect(screen.getByText('Abrir')).toHaveFocus();
  });

  it('com duas gavetas empilhadas, só a de cima reage ao Esc e ao Tab', () => {
    const fechaFicha = jest.fn();
    const fechaForm = jest.fn();
    render(
      <>
        <Gaveta rotulo="Ficha" onClose={fechaFicha}><button>Editar</button></Gaveta>
        <Gaveta rotulo="Formulário" onClose={fechaForm}><input aria-label="Nome" /><button>Salvar</button></Gaveta>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fechaForm).toHaveBeenCalledTimes(1);
    expect(fechaFicha).not.toHaveBeenCalled();
    screen.getByLabelText('Nome').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    // Tab avança do campo para o botão da gaveta de cima, sem ser puxado de volta
    // pela de baixo; o foco do navegador só se move no Tab real, então conferimos que não saiu do painel.
    expect(screen.getByRole('dialog', { name: 'Formulário' }).contains(document.activeElement)).toBe(true);
  });

  it('ao fechar a de cima, a de baixo volta a tratar o teclado', () => {
    const fechaFicha = jest.fn();
    const tela = (comForm: boolean) => (
      <>
        <Gaveta rotulo="Ficha" onClose={fechaFicha}><button>Editar</button></Gaveta>
        {comForm && <Gaveta rotulo="Formulário" onClose={jest.fn()}><button>Salvar</button></Gaveta>}
      </>
    );
    const { rerender } = render(tela(true));
    rerender(tela(false));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fechaFicha).toHaveBeenCalledTimes(1);
  });
});
