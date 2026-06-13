import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../Button';

describe('Button (canônico)', () => {
  it('renderiza variante primary com bg-brand', () => {
    render(<Button variant="primary">Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn.className).toContain('bg-brand');
  });

  it('dispara onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Clique' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('não dispara onClick quando disabled', () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Bloqueado
      </Button>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bloqueado' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
