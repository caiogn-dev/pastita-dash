/**
 * Novo pedido em 4 passos (28/10): Cliente → Itens → Entrega → Pagamento.
 * Clicar no cartão põe o item no pedido, a busca "/" filtra, e o botão diz
 * o que falta em vez de só ficar cinza.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { oQueFalta } from '../NovoPedidoPage';

const wiz: Record<string, any> = {};
const reset = () => Object.assign(wiz, {
  storeSlug: 'ivoneth', productStoreKey: 'ivoneth',
  customer: null, setCustomer: jest.fn(),
  cart: [], addToCart: jest.fn(), addComboToCart: jest.fn(), changeQty: jest.fn(), removeFromCart: jest.fn(),
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
  surchargeReason: '', setSurchargeReason: jest.fn(),
  cupom: null, setCupom: jest.fn(), trocoPara: null, setTrocoPara: jest.fn(), bandeiraDoVale: '', setBandeiraDoVale: jest.fn(),
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
    combos: [{
      id: 'c1', name: 'Combo Lanche', price: 15, is_active: true, track_stock: false, stock_quantity: 0,
      groups: [{ id: 'g1', title: 'Salgado', product_name: '', product_id: null, is_required: true, min_selections: 1,
        max_selections: 1, allow_duplicate_variants: false, position: 0, variant_limits: [],
        product_options: [{ product_id: 'p1', name: 'Coxinha', price: 5, max_selections: 1 }, { product_id: 'p9', name: 'Kibe', price: 5, max_selections: 1 }] }],
    }],
  }),
}));
jest.mock('../ClienteDoPedido', () => ({ ClienteDoPedido: () => <div>cliente</div> }));
jest.mock('../EntregaDoPedido', () => ({ EntregaDoPedido: () => <div>entrega</div> }));
const mockValidarCupom = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { validarCupom: (...a: unknown[]) => mockValidarCupom(...a) } }));
jest.mock('../../../../services/api', () => ({ getErrorMessage: () => 'erro' }));
jest.mock('../../../../hooks', () => ({
  useStore: () => ({ storeId: 's1', storeSlug: 'ivoneth' }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NovoPedidoPage } = require('../NovoPedidoPage');

const montar = () => render(<MemoryRouter><NovoPedidoPage /></MemoryRouter>);
const passo = (rotulo: string) => fireEvent.click(
  within(screen.getByRole('navigation', { name: 'Passos do pedido' })).getByRole('button', { name: new RegExp(`^${rotulo}`) }),
);

beforeEach(reset);

describe('oQueFalta', () => {
  const base = { ...({} as any), customer: { id: 'c1', phone_number: '63999990000' }, cart: [{ quantity: 1 }], deliveryMethod: 'pickup', freeAddressText: '', routeQuote: null, enableScheduling: false, scheduledDate: '', scheduledTime: '', paymentMethod: 'pix', bandeiraDoVale: '' };

  it('pede cliente, depois item, depois frete', () => {
    expect(oQueFalta({ ...base, customer: null })).toBe('Escolha o cliente');
    expect(oQueFalta({ ...base, cart: [] })).toBe('Adicione pelo menos um item');
    expect(oQueFalta({ ...base, deliveryMethod: 'delivery', freeAddressText: 'Rua A' })).toBe('Calcule o frete');
    expect(oQueFalta(base)).toBeNull();
  });

  it('cliente novo sem telefone não passa', () => {
    expect(oQueFalta({ ...base, customer: { id: '', phone_number: '' } })).toBe('Informe o telefone do cliente');
  });

  it('vale sem bandeira não passa', () => {
    expect(oQueFalta({ ...base, paymentMethod: 'voucher_on_delivery' })).toBe('Escolha a bandeira do vale');
    expect(oQueFalta({ ...base, paymentMethod: 'voucher_on_delivery', bandeiraDoVale: 'alelo' })).toBeNull();
  });

  it('agendado sem faixa não passa', () => {
    expect(oQueFalta({ ...base, enableScheduling: true, scheduledDate: '2026-10-29' })).toMatch(/faixa/);
  });
});

describe('NovoPedidoPage', () => {
  it('clicar no cartão põe o produto no pedido', () => {
    montar();
    passo('Itens');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Coxinha' }));
    expect(wiz.addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('combo aparece no catálogo e entra com as escolhas', () => {
    montar();
    passo('Itens');
    fireEvent.click(screen.getByRole('button', { name: /Combos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Combo Lanche' }));
    const adicionar = screen.getByRole('button', { name: /Adicionar · / });
    expect(adicionar).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kibe' }));
    fireEvent.click(adicionar);
    expect(wiz.addComboToCart).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 1,
      combo: { id: 'c1', selections: { g1: ['p9'] }, resumo: 'Kibe' },
    }));
  });

  it('produto esgotado não entra', () => {
    montar();
    passo('Itens');
    expect(screen.getByRole('button', { name: 'Adicionar Brigadeiro' })).toBeDisabled();
  });

  it('categoria filtra a grade', () => {
    montar();
    passo('Itens');
    fireEvent.click(screen.getByRole('button', { name: /Doces/ }));
    expect(screen.queryByRole('button', { name: 'Adicionar Coxinha' })).toBeNull();
  });

  it('começa no cliente e não segue sem ele, dizendo o motivo', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Quem é o cliente?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar · Itens/ })).toBeDisabled();
    expect(screen.getByText('Escolha o cliente')).toBeInTheDocument();
  });

  it('Continuar leva ao próximo passo', () => {
    wiz.customer = { id: 'c1', name: 'Ana', phone_number: '63999990000' };
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Continuar · Itens/ }));
    expect(screen.getByRole('heading', { name: 'O que vai no pedido?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar · Entrega/ })).toBeDisabled();
  });

  it('no último passo, o que falta de antes leva até lá', () => {
    wiz.customer = { id: 'c1', name: 'Ana', phone_number: '63999990000' };
    montar();
    passo('Pagamento');
    expect(screen.getByRole('button', { name: /Concluir/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Adicione pelo menos um item' }));
    expect(screen.getByRole('heading', { name: 'O que vai no pedido?' })).toBeInTheDocument();
  });

  it('com tudo pronto, Ctrl+Enter segue até concluir', () => {
    wiz.customer = { id: 'c1', name: 'Ana', phone_number: '63999990000' };
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '5.00' }, quantity: 2 }];
    montar();
    expect(screen.getByTestId('total-do-pedido')).toHaveTextContent('10,00');
    for (let i = 0; i < 3; i += 1) fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(wiz.handleSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(wiz.handleSubmit).toHaveBeenCalled();
  });

  it('ajustes ficam fechados até serem chamados', () => {
    montar();
    expect(screen.queryByLabelText('Desconto')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Desconto' }));
    expect(screen.getByLabelText('Desconto')).toBeInTheDocument();
  });

  it('cupom é conferido no servidor antes de entrar no pedido', async () => {
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '20.00' }, quantity: 1 }];
    mockValidarCupom.mockResolvedValue({ valido: true, codigo: 'VOLTA10', desconto: 2 });
    montar();
    fireEvent.click(screen.getByRole('button', { name: '+ Cupom' }));
    fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'volta10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await screen.findByRole('button', { name: '+ Cupom' });
    expect(mockValidarCupom).toHaveBeenCalledWith('ivoneth', 'VOLTA10', 20, undefined);
    expect(wiz.setCupom).toHaveBeenCalledWith({ codigo: 'VOLTA10', desconto: 2 });
  });

  it('cupom recusado mostra o motivo e não entra', async () => {
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '20.00' }, quantity: 1 }];
    mockValidarCupom.mockResolvedValue({ valido: false, erro: 'Cupom expirado' });
    montar();
    fireEvent.click(screen.getByRole('button', { name: '+ Cupom' }));
    fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('Cupom expirado')).toBeInTheDocument();
    expect(wiz.setCupom).not.toHaveBeenCalled();
  });

  it('cupom aplicado desconta do total', () => {
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '20.00' }, quantity: 1 }];
    wiz.cupom = { codigo: 'VOLTA10', desconto: 2 };
    montar();
    expect(screen.getByTestId('total-do-pedido')).toHaveTextContent('18,00');
  });

  it('dinheiro pede troco e mostra quanto levar', () => {
    wiz.cart = [{ product: { id: 'p1', name: 'Coxinha', price: '20.00' }, quantity: 1 }];
    wiz.paymentMethod = 'cash';
    wiz.trocoPara = 50;
    montar();
    passo('Pagamento');
    expect(screen.getByTestId('troco-a-levar')).toHaveTextContent('30,00');
  });

  it('vale mostra as bandeiras', () => {
    wiz.paymentMethod = 'voucher_on_delivery';
    montar();
    passo('Pagamento');
    fireEvent.click(screen.getByRole('radio', { name: 'Alelo' }));
    expect(wiz.setBandeiraDoVale).toHaveBeenCalledWith('alelo');
  });
});
