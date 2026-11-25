import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryHeader } from '../CategoryHeader';

// Ivoneth 25/11: "Pedidos até dia 15/12" na Ceia de Natal — selo no cardápio.
const base = { id: 'c1', name: 'Ceia de Natal', is_active: true, sort_order: 1, products: [] };
const props = { collapsed: false, onToggleCollapse: jest.fn(), onTogglePause: jest.fn() };

describe('CategoryHeader — aviso no cardápio', () => {
  it('mostra o aviso atual ao lado do nome', () => {
    render(<CategoryHeader {...props} group={{ ...base, aviso: 'Pedidos até dia 15/12' }} onSaveAviso={jest.fn()} />);
    expect(screen.getByText('Pedidos até dia 15/12')).toBeInTheDocument();
  });

  it('edita e salva o aviso', async () => {
    const onSaveAviso = jest.fn().mockResolvedValue(undefined);
    render(<CategoryHeader {...props} group={{ ...base, aviso: '' }} onSaveAviso={onSaveAviso} />);
    fireEvent.click(screen.getByRole('button', { name: /aviso no cardápio/i }));
    const campo = screen.getByRole('textbox', { name: /aviso no cardápio/i });
    expect(campo).toHaveAttribute('maxLength', '80');
    fireEvent.change(campo, { target: { value: '  Pedidos até dia 15/12 ' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar aviso/i }));
    await waitFor(() => expect(onSaveAviso).toHaveBeenCalledWith('Pedidos até dia 15/12'));
  });

  it('apagar o texto tira o aviso', async () => {
    const onSaveAviso = jest.fn().mockResolvedValue(undefined);
    render(<CategoryHeader {...props} group={{ ...base, aviso: 'Pedidos até dia 15/12' }} onSaveAviso={onSaveAviso} />);
    fireEvent.click(screen.getByRole('button', { name: /aviso no cardápio/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /aviso no cardápio/i }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar aviso/i }));
    await waitFor(() => expect(onSaveAviso).toHaveBeenCalledWith(''));
  });
});
