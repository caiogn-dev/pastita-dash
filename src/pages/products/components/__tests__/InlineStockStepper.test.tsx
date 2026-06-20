import { render, screen, fireEvent } from '@testing-library/react';
import { InlineStockStepper } from '../InlineStockStepper';

describe('InlineStockStepper', () => {
  it('incrementa e decrementa, sem passar de 0', () => {
    const onChange = jest.fn();
    const { rerender } = render(<InlineStockStepper value={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('aumentar estoque'));
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByLabelText('diminuir estoque'));
    expect(onChange).toHaveBeenLastCalledWith(0);
    rerender(<InlineStockStepper value={0} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('diminuir estoque'));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
