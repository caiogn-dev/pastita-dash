import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockRegistrar = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  ordersService: { registrarPagamento: (...a: unknown[]) => mockRegistrar(...a) },
  getErrorMessage: (e: unknown) => String((e as Error)?.message ?? e),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock('react-hot-toast', () => ({ __esModule: true, default: mockToast }));

import { RegistrarPagamentoModal } from '../RegistrarPagamentoModal';

const pedido = {
  id: 'o1', order_number: 'CE-1', status: 'delivered', total: 80, amount_paid: 30, amount_due: 50,
};

beforeEach(() => jest.clearAllMocks());

it('valor padrão é o que falta e a forma padrão é dinheiro', async () => {
  mockRegistrar.mockResolvedValue({ order: { ...pedido, amount_paid: 80, amount_due: 0, payment_status: 'paid' } });
  const onRegistrado = jest.fn();
  render(<RegistrarPagamentoModal isOpen order={pedido} onClose={jest.fn()} onRegistrado={onRegistrado} />);

  expect((screen.getByLabelText('Valor recebido') as HTMLInputElement).value).toBe('50');
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

  await waitFor(() => expect(onRegistrado).toHaveBeenCalled());
  const [id, corpo] = mockRegistrar.mock.calls[0];
  expect(id).toBe('o1');
  expect(corpo.payment_method).toBe('cash');
  expect(corpo.amount).toBe(50);
  expect(typeof corpo.idempotency_key).toBe('string');
  expect(corpo.idempotency_key.length).toBeGreaterThan(0);
});

it('escolhe a maquininha e manda o valor digitado com vírgula', async () => {
  mockRegistrar.mockResolvedValue({ order: pedido });
  render(<RegistrarPagamentoModal isOpen order={pedido} onClose={jest.fn()} onRegistrado={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Débito (maquininha)' }));
  fireEvent.change(screen.getByLabelText('Valor recebido'), { target: { value: '20,50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
  await waitFor(() => expect(mockRegistrar).toHaveBeenCalled());
  expect(mockRegistrar.mock.calls[0][1]).toMatchObject({ payment_method: 'debit_card', amount: 20.5 });
});

it('duplo clique manda a MESMA chave (o backend devolve o mesmo registro)', async () => {
  let resolver: (v: unknown) => void = () => {};
  mockRegistrar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  render(<RegistrarPagamentoModal isOpen order={pedido} onClose={jest.fn()} onRegistrado={jest.fn()} />);
  const botao = screen.getByRole('button', { name: 'Registrar pagamento' });
  fireEvent.click(botao);
  fireEvent.click(botao);
  resolver({ order: pedido });
  await waitFor(() => expect(mockRegistrar).toHaveBeenCalled());
  const chaves = new Set(mockRegistrar.mock.calls.map((c) => c[1].idempotency_key));
  expect(chaves.size).toBe(1);
  expect(mockRegistrar.mock.calls.length).toBe(1);
});

it('valor acima do que falta nem sai do navegador', async () => {
  render(<RegistrarPagamentoModal isOpen order={pedido} onClose={jest.fn()} onRegistrado={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Valor recebido'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falta receber');
  expect(mockRegistrar).not.toHaveBeenCalled();
});

it('erro do backend aparece e o modal continua aberto', async () => {
  mockRegistrar.mockRejectedValue(new Error('Este pedido já está pago.'));
  const onClose = jest.fn();
  render(<RegistrarPagamentoModal isOpen order={pedido} onClose={onClose} onRegistrado={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este pedido já está pago.');
  expect(onClose).not.toHaveBeenCalled();
});
