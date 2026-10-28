/**
 * Novo pedido em tela só (desktop, 28/10): clicar no cartão põe o item no
 * pedido, a busca "/" filtra, e o Concluir diz o que falta em vez de só
 * ficar cinza.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { oQueFalta } from '../NovoPedidoPage';

const wiz: Record<string, any> = {};
const reset = () => Object.assign(wiz, {
  storeSlug: 'ivoneth', productStoreKey: 'ivoneth',
  customer: null, setCustomer: jest.fn(),
  cart: [], addToCart: jest.fn(), changeQty: jest.fn(), removeFromCart: jest.fn(),
  deliveryMethod: 'pickup', setDeliveryMethod: jest.fn(),
  selectedAddress: null, setSelectedAddress: jest.fn(), escolherEnderecoSalvo: jest.fn(),
  freeAddressText: '', setFreeAddressText: jest.fn(),
  routeQuote: null, calculatingRoute: false, handleCalculateRoute: jest.fn(), handleUseSharedLocation: jest.fn(),
  customerHasPhone: false,
  enableScheduling: false, setEnableScheduling: jest.fn(),
  scheduledDate: '', setScheduledDate: jest.fn(), scheduledTime: '', setScheduledTime: jest.fn(),
  observacoes: '', setObservacoes: jest.fn(),
  discountType: 'fixed', setDiscountType: jest.fn(), discountValue: '', setDiscountValue: jest.fn(),
  surchargeValue: '', setSurchargeValue: jest.fn(), discountReason: '', setDiscountReason: jest.fn(),
  paymentMethod: 'pix', setPaymentMethod: jest.fn(),
  suppressNotifications: false, setSuppressNotifications: jest.fn(),
  submitting: false, handleSubmit: jest.fn(), aplicarRascunho: jest.fn(),
});

jest.mock('../../../../components/orders/newOrder/useNewOrderWizard', () => ({
  useNewOrderWizard: () => wiz,
}));
jest.mock('../../../../components/orders/newOrder/useProdutosDaLoja', () => ({
  useProdutosDaLoja: () => ({
    carregando: false,
    produtos: [
      { id: 'p1', name: 'Coxinha', price: '5.00', category_name: 'Salgados', track_stock: false },
      { id: 'p2', name: 'Brigadeiro', price: '3.00', category_name: 'Doces', track_stock: true, stock_quantity: 0 },
    ],
  }),
}));
jest.mock('../../../../components/orders/newOrder/steps/StepCliente', () => ({ StepCliente: () => <div>cliente</div> }));
jest.mock('../../../../components/orders/newOrder/steps/StepEntrega', () => ({ StepEntrega: () => <div>entrega</div> }));
jest.mock('../../../../hooks', () => ({
  useStore: () => ({ storeId: 's1', storeSlug: 'ivoneth' }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NovoPedidoPage } = require('../NovoPedidoPage');

const montar = () => render(<MemoryRouter><NovoPedidoPage /></MemoryRouter>);

beforeEach(reset);

describe('oQueFalta', () => {
  const base = { ...({} as any), customer: { id: 'c1', phone_number: '63999990000' }, cart: [{ quantity: 1 }], deliveryMethod: 'pickup', freeAddressText: '', routeQuote: null, enableScheduling: false, scheduledDate: '', scheduledTime: '' };

  it('pede cliente, depois item, depois frete', () => {
    expect(oQueFalta({ ...base, customer: null })).toBe('Escolha o cliente');
    expect(oQueFalta({ ...base, cart: [] })).toBe('Adicione pelo menos um item');
    expect(oQueFalta({ ...base, deliveryMethod: 'delivery', freeAddressText: 'Rua A' })).toBe('Calcule o frete');
    expect(oQueFalta(base)).toBeNull();
  });

  it('cliente novo sem telefone não passa', () => {
    expect(oQueFalta({ ...base, customer: { id: '', phone_number: '' } })).toBe('Informe o telefone do cliente');
  });

  it('agendado sem faixa não passa', () => {
    expect(oQueFalta({ ...base, enableScheduling: true, scheduledDate: '2026-10-29' })).toMatch(/faixa/);
  });
});

describe('NovoPedidoPage', () => {
  it('clicar no cartão põe o produto no pedido', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Coxinha' }));
    expect(wiz.addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('produto esgotado não entra', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Adicionar Brigadeiro' })).toBeDisabled();
  });

  it('categoria filtra a grade', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Doces/ }));
    expect(screen.queryByRole('button', { name: 'Adicionar Coxinha' })).toBeNull();
  });

  it('Concluir desabilitado diz o motivo', () => {
    montar();
    expect(screen.getByRole('button', { name: /Concluir pedido/ })).toBeDisabled();
    expect(screen.getByText('Escolha o cliente')).toBeInTheDocument();
  });

  it('com tudo pronto, Ctrl+Enter conclui', () => {
    wiz.customer = { id: 'c1', phone_number: '63999990000' };
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '5.00' }, quantity: 2 }];
    montar();
    expect(screen.getByTestId('total-do-pedido')).toHaveTextContent('10,00');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(wiz.handleSubmit).toHaveBeenCalled();
  });
});
