import { render, screen, fireEvent } from '@testing-library/react';
import { StepConfirmar } from '../StepConfirmar';

const base = {
  cart: [{ product: { id: 'p1', name: 'Salada', price: 30 } as never, quantity: 1 }],
  deliveryMethod: 'pickup' as const,
  deliveryAddress: '',
  routeQuote: null,
  paymentMethod: 'pix' as const,
  setPaymentMethod: jest.fn(),
  suppressNotifications: false,
  setSuppressNotifications: jest.fn(),
};

function ajustes(over: Record<string, unknown> = {}) {
  return {
    discountType: 'percent' as const, setDiscountType: jest.fn(),
    discountValue: '', setDiscountValue: jest.fn(), discountReason: '', setDiscountReason: jest.fn(),
    surchargeValue: '', setSurchargeValue: jest.fn(), surchargeReason: '', setSurchargeReason: jest.fn(),
    ...over,
  };
}

test('desconto e acréscimo ficam recolhidos na confirmação e abrem com um toque', () => {
  const a = ajustes();
  render(<StepConfirmar {...base} {...a} />);
  expect(screen.queryByLabelText(/valor do desconto/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /desconto ou acréscimo/i }));
  fireEvent.change(screen.getByLabelText(/valor do desconto/i), { target: { value: '10' } });
  expect(a.setDiscountValue).toHaveBeenCalledWith('10');
});

test('com desconto já preenchido a seção vem aberta e o total desconta', () => {
  render(<StepConfirmar {...base} {...ajustes({ discountValue: '10' })} />);
  expect(screen.getByLabelText(/valor do desconto/i)).toBeInTheDocument();
  expect(screen.getByText('Total').parentElement).toHaveTextContent('27,00');
});
