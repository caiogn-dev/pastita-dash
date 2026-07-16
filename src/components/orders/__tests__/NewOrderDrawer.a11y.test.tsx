// src/components/orders/__tests__/NewOrderDrawer.a11y.test.tsx
// Regressão de acessibilidade do drawer PDV: role/aria, Escape, scroll-lock e foco.
import { render, screen, fireEvent } from '@testing-library/react';
jest.mock('../../crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { NewOrderDrawer } from '../NewOrderDrawer';

const baseProps = { storeSlug: 'loja-1', storeId: 'uuid-1' };

test('painel tem role="dialog", aria-modal e aria-label', () => {
  render(<NewOrderDrawer isOpen onClose={() => {}} {...baseProps} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-label', 'Novo Pedido (PDV)');
});

test('Escape fecha o drawer', () => {
  const onClose = jest.fn();
  render(<NewOrderDrawer isOpen onClose={onClose} {...baseProps} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('trava o scroll do body enquanto aberto e libera ao fechar', () => {
  const { rerender } = render(<NewOrderDrawer isOpen onClose={() => {}} {...baseProps} />);
  expect(document.body.style.overflow).toBe('hidden');
  rerender(<NewOrderDrawer isOpen={false} onClose={() => {}} {...baseProps} />);
  expect(document.body.style.overflow).toBe('');
});

test('foco inicial vai para dentro do drawer ao abrir', () => {
  render(<NewOrderDrawer isOpen onClose={() => {}} {...baseProps} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog.contains(document.activeElement)).toBe(true);
});
