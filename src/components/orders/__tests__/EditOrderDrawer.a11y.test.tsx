import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditOrderDrawer } from '../EditOrderDrawer';
import type { Order } from '../../../types';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../services/orders', () => ({
  __esModule: true,
  ordersService: { updateOrder: jest.fn(), adjustOrder: jest.fn() },
}));

jest.mock('../../../services/products', () => ({
  __esModule: true,
  productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) },
}));

const order = {
  id: 'ord-1',
  store: 'loja-1',
  customer_name: 'Cliente',
  customer_phone: '',
  items: [],
} as unknown as Order;

// O botão de fechar do drawer de edição de pedido é icon-only (XMarkIcon).
// O drawer irmão (NewOrderDrawer) já rotula o seu; este ficou sem nome acessível.
describe('EditOrderDrawer — acessibilidade do botão de fechar', () => {
  it('expõe nome acessível no botão de fechar', () => {
    render(<EditOrderDrawer order={order} onClose={jest.fn()} onSaved={jest.fn()} />);

    const fechar = screen.getByRole('button', { name: /fechar/i });
    expect(fechar).toBeInTheDocument();
  });

  it('é um diálogo modal e Esc fecha', () => {
    const onClose = jest.fn();
    render(<EditOrderDrawer order={order} onClose={onClose} onSaved={jest.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Editar pedido' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
