import { render, screen, fireEvent } from '@testing-library/react';
import { StatusToggle, FeaturedToggle } from '../InlineToggle';

describe('InlineToggle', () => {
  it('StatusToggle chama onChange com o novo estado', () => {
    const onChange = jest.fn();
    render(<StatusToggle active={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Ativo'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('FeaturedToggle alterna', () => {
    const onChange = jest.fn();
    render(<FeaturedToggle featured={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('destacar'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
