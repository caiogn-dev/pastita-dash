import { render, screen, fireEvent } from '@testing-library/react';
import { InlinePriceField } from '../InlinePriceField';

describe('InlinePriceField', () => {
  it('commita no blur quando muda', () => {
    const onCommit = jest.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('preço') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15.5' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(15.5);
  });

  it('não commita se igual ou inválido', () => {
    const onCommit = jest.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('preço');
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
