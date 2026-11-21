// O visualizador de mídia cobre a tela inteira: precisa se comportar como diálogo
// (Esc fecha, foco entra e volta, leitor de tela sabe que é modal).
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaViewer } from '../MediaViewer';

describe('MediaViewer — comportamento de diálogo', () => {
  it('é um diálogo modal com nome acessível', () => {
    render(<MediaViewer url="u" type="image" fileName="foto.jpg" onClose={() => {}} />);
    const dialogo = screen.getByRole('dialog', { name: /foto\.jpg/i });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
  });

  it('Esc fecha', () => {
    const onClose = jest.fn();
    render(<MediaViewer url="u" type="image" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('abre com o foco dentro e devolve o foco ao botão que abriu', () => {
    const Pagina = () => {
      const [aberto, setAberto] = useState(false);
      return (
        <>
          <button onClick={() => setAberto(true)}>abrir foto</button>
          {aberto && <MediaViewer url="u" type="image" onClose={() => setAberto(false)} />}
        </>
      );
    };
    render(<Pagina />);
    const abrir = screen.getByRole('button', { name: 'abrir foto' });
    abrir.focus();
    fireEvent.click(abrir);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(abrir).toHaveFocus();
  });
});
