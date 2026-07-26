// Regressão de acessibilidade do MediaViewer (visualizador de mídia do inbox WhatsApp).
// Botões icon-only (emoji) e a imagem precisam de nome acessível para leitores de tela.
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaViewer } from '../MediaViewer';

describe('MediaViewer — acessibilidade dos botões icon-only', () => {
  it('expõe nome acessível nos botões de baixar e fechar', () => {
    render(
      <MediaViewer
        url="https://example.com/foto.jpg"
        type="image/jpeg"
        fileName="foto.jpg"
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /baixar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('o botão fechar dispara onClose', () => {
    const onClose = jest.fn();
    render(<MediaViewer url="u" type="image" fileName="a.png" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a imagem tem texto alternativo mesmo sem fileName', () => {
    render(<MediaViewer url="u" type="image" onClose={() => {}} />);
    // getByRole('img') exige nome acessível não-vazio (falha se alt="" ou ausente).
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
