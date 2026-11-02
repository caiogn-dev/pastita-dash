// Carlos (27/10): o bot marcou ENTREGA para quem ia retirar e o painel não
// tinha como trocar — nem endereço, nem cupom.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditOrderDrawer } from '../EditOrderDrawer';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/orders', () => ({
  ordersService: {
    updateOrder: jest.fn().mockResolvedValue({ id: 'o1' }),
    adjustOrder: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../../services/products', () => ({
  productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const pedidoDeEntrega = {
  id: 'o1', customer_name: 'Carlos', customer_phone: '63999990000', store: 'loja-1',
  delivery_method: 'delivery', delivery_fee: 8,
  delivery_address: { street: 'Quadra 110 Sul Alameda 3', number: '51', neighborhood: 'Plano Diretor Sul', city: 'Palmas', state: 'TO' },
} as never;

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
const ultimoAjuste = () => (ordersService.adjustOrder as jest.Mock).mock.calls.at(-1)?.[1];

beforeEach(() => jest.clearAllMocks());

test('trocar para retirada manda delivery_method pickup e esconde o endereço', async () => {
  render(<EditOrderDrawer order={pedidoDeEntrega} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: /retirada/i }));
  expect(screen.queryByLabelText(/^rua/i)).not.toBeInTheDocument();
  salvar();
  await waitFor(() => expect(ordersService.adjustOrder).toHaveBeenCalled());
  expect(ultimoAjuste()).toEqual(expect.objectContaining({ delivery_method: 'pickup' }));
});

test('endereço editado vai inteiro e sem frete — o servidor cota de novo', async () => {
  render(<EditOrderDrawer order={pedidoDeEntrega} onClose={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getByLabelText(/^rua/i)).toHaveValue('Quadra 110 Sul Alameda 3');
  fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '60' } });
  salvar();
  await waitFor(() => expect(ordersService.adjustOrder).toHaveBeenCalled());
  const adj = ultimoAjuste();
  expect(adj.delivery_address).toEqual(expect.objectContaining({ street: 'Quadra 110 Sul Alameda 3', number: '60' }));
  expect(adj).not.toHaveProperty('delivery_fee');
});

test('retirada → entrega exige endereço antes de salvar', async () => {
  const pedidoDeRetirada = { ...(pedidoDeEntrega as object), delivery_method: 'pickup', delivery_address: {} } as never;
  render(<EditOrderDrawer order={pedidoDeRetirada} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: /entrega/i }));
  salvar();
  expect(await screen.findByText(/informe a rua/i)).toBeInTheDocument();
  expect(ordersService.adjustOrder).not.toHaveBeenCalled();
});

test('cupom digitado vai como coupon_code', async () => {
  render(<EditOrderDrawer order={pedidoDeEntrega} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/cupom/i), { target: { value: 'dez' } });
  salvar();
  await waitFor(() => expect(ordersService.adjustOrder).toHaveBeenCalled());
  expect(ultimoAjuste()).toEqual(expect.objectContaining({ coupon_code: 'DEZ' }));
});

test('erro do servidor aparece com a mensagem dele (cupom inválido, fora da área)', async () => {
  (ordersService.adjustOrder as jest.Mock).mockRejectedValueOnce({ response: { data: { error: 'Cupom nao encontrado' } } });
  const toast = (await import('react-hot-toast')).default;
  render(<EditOrderDrawer order={pedidoDeEntrega} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/cupom/i), { target: { value: 'X' } });
  salvar();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cupom nao encontrado'));
});

// 27/10, Ivoneth: marcou "Agendado", escolheu a data e salvou sem faixa — o
// painel dizia "Pedido atualizado" e nada era gravado.
test('agendado sem faixa não salva e diz o que falta', async () => {
  render(<EditOrderDrawer order={pedidoDeEntrega} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /agendado/i }));
  fireEvent.change(screen.getByLabelText(/data do agendamento/i), { target: { value: '2026-10-29' } });
  salvar();
  expect(await screen.findByText(/escolha a faixa/i)).toBeInTheDocument();
  expect(ordersService.updateOrder).not.toHaveBeenCalled();
});

// O DRF manda dinheiro como texto ("0.00"). Comparar "0.00" com 0 dava
// diferente, e TODO salvar chamava o ajuste — em pedido cancelado, trocar só
// o nome gravava o nome e mostrava erro (pedido meio editado).
test('dinheiro vindo como texto não dispara ajuste quando só o nome muda', async () => {
  const pedido = {
    ...(pedidoDeEntrega as object), discount: '0.00', surcharge_value: '0.00', delivery_fee: '8.00',
  } as never;
  render(<EditOrderDrawer order={pedido} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Carlos Silva' } });
  salvar();
  await waitFor(() => expect(ordersService.updateOrder).toHaveBeenCalled());
  expect(ordersService.adjustOrder).not.toHaveBeenCalled();
});
