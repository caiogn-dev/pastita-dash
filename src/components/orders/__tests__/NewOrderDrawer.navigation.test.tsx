// src/components/orders/__tests__/NewOrderDrawer.navigation.test.tsx
// Navegação do wizard PDV: o operador precisa conseguir VOLTAR de qualquer
// etapa — inclusive da confirmação, quando percebe que um item foi errado.
import { render, screen, fireEvent } from '@testing-library/react';
jest.mock('../../crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useNewOrderWizard } from '../newOrder/useNewOrderWizard';
import type { NewOrderWizard } from '../newOrder/useNewOrderWizard';
import { NewOrderDrawer } from '../NewOrderDrawer';

jest.mock('../newOrder/useNewOrderWizard', () => ({
  useNewOrderWizard: jest.fn(),
}));

const mockedUseWizard = useNewOrderWizard as jest.MockedFunction<typeof useNewOrderWizard>;

function makeWizard(overrides: Partial<NewOrderWizard> = {}): NewOrderWizard {
  return {
    step: 0, setStep: jest.fn(), next: jest.fn(), back: jest.fn(), canProceed: () => true,
    customer: null, setCustomer: jest.fn(),
    deliveryMethod: 'pickup', setDeliveryMethod: jest.fn(),
    selectedAddress: null, setSelectedAddress: jest.fn(),
    freeAddressText: '', setFreeAddressText: jest.fn(),
    routeQuote: null, calculatingRoute: false, handleCalculateRoute: jest.fn(),
    cart: [{ product: { id: 'p1', name: 'Pastel', price: 10 } as never, quantity: 2 }],
    addToCart: jest.fn(), changeQty: jest.fn(), removeFromCart: jest.fn(),
    discountType: 'percent', setDiscountType: jest.fn(),
    discountValue: '', setDiscountValue: jest.fn(), discountReason: '', setDiscountReason: jest.fn(),
    surchargeValue: '', setSurchargeValue: jest.fn(), surchargeReason: '', setSurchargeReason: jest.fn(),
    paymentMethod: 'pix', setPaymentMethod: jest.fn(), submitting: false, handleSubmit: jest.fn(),
    enableScheduling: false, setEnableScheduling: jest.fn(),
    scheduledDate: '', setScheduledDate: jest.fn(),
    scheduledTime: '', setScheduledTime: jest.fn(),
    reset: jest.fn(), productStoreKey: 'uuid-1', storeSlug: 'loja-1',
    ...overrides,
  };
}

function renderAt(overrides: Partial<NewOrderWizard> = {}) {
  const wiz = makeWizard(overrides);
  mockedUseWizard.mockReturnValue(wiz);
  render(<NewOrderDrawer isOpen storeSlug="loja-1" storeId="uuid-1" onClose={() => {}} />);
  return wiz;
}

describe('NewOrderDrawer — voltar na etapa de confirmação', () => {
  test('etapa Confirmar (4) tem botão Voltar que chama wiz.back', () => {
    const wiz = renderAt({ step: 4 });
    const voltar = screen.getByRole('button', { name: /voltar/i });
    fireEvent.click(voltar);
    expect(wiz.back).toHaveBeenCalled();
  });

  test('etapa Confirmar (4) tem botão Criar Pedido que chama handleSubmit', () => {
    const wiz = renderAt({ step: 4 });
    fireEvent.click(screen.getByRole('button', { name: /criar pedido/i }));
    expect(wiz.handleSubmit).toHaveBeenCalled();
  });

  test('durante o submit, Voltar e Criar Pedido ficam desabilitados', () => {
    renderAt({ step: 4, submitting: true });
    expect(screen.getByRole('button', { name: /voltar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /criando pedido/i })).toBeDisabled();
  });
});

describe('NewOrderDrawer — barra de progresso navegável', () => {
  test('etapas anteriores são clicáveis e pulam direto (setStep)', () => {
    const wiz = renderAt({ step: 4 });
    fireEvent.click(screen.getByRole('button', { name: /ir para itens/i }));
    expect(wiz.setStep).toHaveBeenCalledWith(2);
  });

  test('etapas futuras não viram botão', () => {
    renderAt({ step: 1 });
    expect(screen.queryByRole('button', { name: /ir para confirmar/i })).not.toBeInTheDocument();
  });
});

describe('NewOrderDrawer — atalho "editar itens" no resumo', () => {
  test('resumo da confirmação tem link Editar que volta pra etapa Itens', () => {
    const wiz = renderAt({ step: 4 });
    fireEvent.click(screen.getByRole('button', { name: /editar itens/i }));
    expect(wiz.setStep).toHaveBeenCalledWith(2);
  });
});
