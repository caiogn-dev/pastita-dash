import { render, screen, fireEvent } from '@testing-library/react';
import { InlinePriceField } from '../InlinePriceField';

const campo = () => screen.getByLabelText('preço') as HTMLInputElement;

describe('InlinePriceField', () => {
  it('mostra em reais: 39,90, não 39.9', () => {
    render(<InlinePriceField value={39.9} onCommit={jest.fn()} />);
    expect(campo()).toHaveValue('39,90');
    expect(screen.getByText('R$')).toBeInTheDocument();
  });

  it('digitar enche pelos centavos: 3990 vira 39,90 e grava 39.9', () => {
    const onCommit = jest.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    fireEvent.change(campo(), { target: { value: '3990' } });
    expect(campo()).toHaveValue('39,90');
    fireEvent.blur(campo());
    expect(onCommit).toHaveBeenCalledWith(39.9);
  });

  it('colar "R$ 15,50" entende reais', () => {
    const onCommit = jest.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    fireEvent.paste(campo(), { clipboardData: { getData: () => 'R$ 15,50' } });
    fireEvent.blur(campo());
    expect(onCommit).toHaveBeenCalledWith(15.5);
  });

  it('não grava se igual, vazio ou letras; Esc desfaz', () => {
    const onCommit = jest.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    fireEvent.blur(campo());
    fireEvent.change(campo(), { target: { value: 'abc' } });
    fireEvent.blur(campo());
    expect(campo()).toHaveValue('10,00');
    fireEvent.change(campo(), { target: { value: '5' } });
    fireEvent.keyDown(campo(), { key: 'Escape' });
    expect(campo()).toHaveValue('10,00');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('acompanha o preço quando ele muda de fora', () => {
    const { rerender } = render(<InlinePriceField value={10} onCommit={jest.fn()} />);
    rerender(<InlinePriceField value={12.5} onCommit={jest.fn()} />);
    expect(campo()).toHaveValue('12,50');
  });
});
