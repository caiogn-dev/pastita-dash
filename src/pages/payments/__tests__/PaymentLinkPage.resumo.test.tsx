/**
 * Molde "formulário + resumo" do link de pagamento: o que o lojista digita
 * aparece no resumo vivo e no verbo do botão, e o payload da API não mudou.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const criarLink = jest.fn();
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeName: 'Loja', isStoreSelected: true }),
}));
jest.mock('../../../services', () => ({
  __esModule: true,
  getErrorMessage: () => 'erro',
  paymentsService: {
    createPaymentLink: (...a: unknown[]) => criarLink(...a),
    getPayments: jest.fn().mockResolvedValue({ results: [] }),
  },
  ordersService: { getOrders: jest.fn().mockResolvedValue({ results: [] }) },
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import PaymentLinkPage from '../PaymentLinkPage';

beforeEach(() => {
  jest.clearAllMocks();
  criarLink.mockResolvedValue({ payment: { payment_url: 'https://mp/l', amount: 42.5 }, store_payment: {} });
});

describe('PaymentLinkPage — formulário + resumo', () => {
  it('digitar o valor atualiza o resumo e o texto do botão', async () => {
    render(<PaymentLinkPage />);
    expect(screen.getByRole('button', { name: 'Gerar link' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Valor'), '4250');

    const resumo = screen.getByRole('region', { name: 'Resumo' });
    expect(within(resumo).getByText(/42,50/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar link de R\$\s*42,50/ })).toBeInTheDocument();
  });

  it('o nome do pagador entra no resumo', async () => {
    render(<PaymentLinkPage />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Diana');
    expect(within(screen.getByRole('region', { name: 'Resumo' })).getByText('Diana')).toBeInTheDocument();
  });

  it('gerar manda o MESMO payload de antes (amount number, textos aparados)', async () => {
    render(<PaymentLinkPage />);
    await userEvent.type(screen.getByLabelText('Valor'), '4250');
    await userEvent.type(screen.getByLabelText('Descrição'), ' Sinal ');
    await userEvent.type(screen.getByLabelText('Nome'), 'Diana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'd@x.com');
    await userEvent.type(screen.getByLabelText('CPF'), '123.456.789-09');
    await userEvent.click(screen.getByRole('button', { name: /Gerar link de/ }));

    await waitFor(() =>
      expect(criarLink).toHaveBeenCalledWith({
        store: 'loja-1',
        amount: 42.5,
        description: 'Sinal',
        payer_name: 'Diana',
        payer_email: 'd@x.com',
        payer_document: '123.456.789-09',
      }),
    );
  });

  it('o link gerado ocupa o lugar do resumo, com copiar e compartilhar', async () => {
    render(<PaymentLinkPage />);
    await userEvent.type(screen.getByLabelText('Valor'), '4250');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Sinal');
    await userEvent.click(screen.getByRole('button', { name: /Gerar link de/ }));

    expect(await screen.findByText('https://mp/l')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova cobrança' })).toBeInTheDocument();
  });

  it('todo campo tem rótulo acessível', () => {
    const { container } = render(<PaymentLinkPage />);
    for (const r of ['Pedido', 'Valor', 'Descrição', 'Nome', 'E-mail', 'CPF']) {
      expect(screen.getByLabelText(r)).toBeInTheDocument();
    }
    container.querySelectorAll('input, select, textarea').forEach((el) => {
      expect((el as HTMLInputElement).labels?.length).toBeGreaterThan(0);
    });
  });
});
