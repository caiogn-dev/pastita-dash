/**
 * Link de pagamento vinculado a um pedido.
 *
 * Pedido do dono em 14/ago: "caso eu lance um pedido manual, é possível
 * vincular / gerar um link de pagamento vinculado ao pedido?" — e depois "e
 * onde eu criaria vinculado a um pedido?".
 *
 * O backend já aceitava `order` em `create_link`, com validação de loja. O que
 * faltava era esta tela: o formulário só sabia gerar cobrança avulsa.
 *
 * Por que importa: cobrança avulsa paga entra como dinheiro sem venda. Medido
 * em produção — 2 cobranças `completed` sem pedido, R$ 249,01 fora do
 * faturamento até o backend passar a criar a venda avulsa.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const criarLink = jest.fn().mockResolvedValue({
  payment: { payment_url: 'https://mp/link', amount: 142 },
  store_payment: {},
});
const listarPedidos = jest.fn().mockResolvedValue({
  results: [
    { id: 'ped-1', order_number: 'CE-123', customer_name: 'Dyana', total: 142 },
    { id: 'ped-2', order_number: 'CE-124', customer_name: 'Yasmine', total: 89.5 },
  ],
});

jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'ce-saladas', storeName: 'Cê Saladas', isStoreSelected: true }),
}));

jest.mock('../../../services', () => ({
  __esModule: true,
  getErrorMessage: () => 'erro',
  paymentsService: {
    createPaymentLink: (...a: unknown[]) => criarLink(...a),
    listStorePayments: jest.fn().mockResolvedValue({ results: [] }),
  },
  ordersService: { getOrders: (...a: unknown[]) => listarPedidos(...a) },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

import PaymentLinkPage from '../PaymentLinkPage';

beforeEach(() => jest.clearAllMocks());

describe('vincular cobrança a um pedido', () => {
  it('lista os pedidos em aberto da loja', async () => {
    render(<PaymentLinkPage />);

    expect(await screen.findByRole('option', { name: /CE-123/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /CE-124/ })).toBeInTheDocument();
  });

  it('só busca pedidos NÃO pagos — cobrar quem já pagou é cobrar duas vezes', async () => {
    render(<PaymentLinkPage />);

    await waitFor(() => expect(listarPedidos).toHaveBeenCalled());
    expect(listarPedidos.mock.calls[0][0]).toMatchObject({ payment_status: 'pending' });
  });

  it('escolher o pedido preenche o valor', async () => {
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.selectOptions(screen.getByLabelText(/pedido/i), 'ped-1');

    expect(screen.getByLabelText(/valor/i)).toHaveValue(142);
  });

  it('manda o pedido junto na criação do link', async () => {
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.selectOptions(screen.getByLabelText(/pedido/i), 'ped-1');
    await userEvent.click(screen.getByRole('button', { name: /gerar/i }));

    await waitFor(() => expect(criarLink).toHaveBeenCalled());
    expect(criarLink.mock.calls[0][0]).toMatchObject({ order: 'ped-1', amount: 142 });
  });
});

describe('o avulso continua existindo', () => {
  it('sem pedido escolhido, nenhuma `order` é enviada', async () => {
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.type(screen.getByLabelText(/valor/i), '50');
    // Sem pedido, a descrição é o que dá identidade — obrigatória agora.
    await userEvent.type(screen.getByLabelText(/descrição/i), 'Sinal do evento');
    await userEvent.click(screen.getByRole('button', { name: /gerar/i }));

    await waitFor(() => expect(criarLink).toHaveBeenCalled());
    expect(criarLink.mock.calls[0][0].order).toBeUndefined();
  });

  it('avisa quando o valor bate com um pedido em aberto e nenhum foi escolhido', async () => {
    // Aconteceu em 14/ago: venda de R$ 62,89 lançada às 20:41, e às 20:54 um
    // link AVULSO do mesmo valor. Pago, o link virou um segundo pedido — a
    // mesma venda contada duas vezes, e uma delas sem itens nenhum. O valor
    // idêntico a um pedido não pago é o sinal, e ele aparece antes do envio.
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.type(screen.getByLabelText(/valor/i), '142');

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/CE-123/);
    expect(aviso).toHaveTextContent(/mesmo valor/i);
  });

  it('o aviso some quando o pedido é vinculado', async () => {
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.type(screen.getByLabelText(/valor/i), '142');
    await screen.findByRole('alert');

    await userEvent.selectOptions(screen.getByLabelText(/pedido/i), 'ped-1');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('valor que não bate com pedido nenhum não gera aviso', async () => {
    // Cobrança avulsa legítima é caso normal — não pode virar tela de susto.
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    await userEvent.type(screen.getByLabelText(/valor/i), '37');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a opção de cobrança avulsa é a padrão', async () => {
    render(<PaymentLinkPage />);

    await screen.findByRole('option', { name: /CE-123/ });
    expect(screen.getByLabelText(/pedido/i)).toHaveValue('');
  });
});
