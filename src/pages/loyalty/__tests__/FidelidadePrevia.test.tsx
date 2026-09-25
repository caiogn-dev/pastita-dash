/**
 * "Prévia ao lado com números" — a direção aprovada pelo dono em 25/09.
 *
 * A tela antiga era um formulário sem resultado: o dono digitava "10" e não
 * via o que o cliente ia ver, nem o que o programa já rendeu. Agora a coluna
 * da direita responde as duas perguntas, e responde AO VIVO.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(), updateStore: jest.fn(), getCategories: jest.fn(),
}));
jest.mock('../../../services/loyalty', () => ({
  loyaltyService: { getAccounts: jest.fn(), resgatarBrinde: jest.fn() },
}));
jest.mock('../../../services/coupons', () => ({ couponsService: { createCoupon: jest.fn() } }));
jest.mock('../../../services/cashback', () => ({
  cashbackService: {
    get: jest.fn(),
    indicacoes: jest.fn().mockResolvedValue({ indicacoes: [], por_indicador: [], referral_percent: '5' }),
  },
}));

import toast from 'react-hot-toast';
import { cashbackService } from '../../../services/cashback';
import { loyaltyService } from '../../../services/loyalty';
import { getStores, getCategories, updateStore } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const cashbackDesligado = {
  enabled: false, percent: '3', referral_percent: '5', expiry_days: 60,
  resumo: {
    saldo_em_circulacao: '0.00', ja_resgatado: '0.00', clientes_com_saldo: 0,
    saldo_de_indicacao: '0.00', vence_em_7_dias: '0.00',
  },
  count: 0, results: [],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/fidelidade']}>
      <Routes>
        <Route path="/stores/:storeId/fidelidade" element={<FidelidadePage />} />
      </Routes>
    </MemoryRouter>,
  );

const previa = () => screen.getByRole('figure', { name: /como o cliente vê/i });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (getStores as jest.Mock).mockResolvedValue(page([store]));
  (getCategories as jest.Mock).mockResolvedValue(page([]));
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 0, results: [],
    resumo: { participantes: 84, brindes_ganhos: 20, brindes_disponiveis: 6, brindes_resgatados: 14, quase_la: 9 },
  });
  (cashbackService.get as jest.Mock).mockResolvedValue(cashbackDesligado);
});

describe('prévia ao lado', () => {
  it('o cartão da prévia acompanha os itens digitados', async () => {
    renderPage();
    const input = await screen.findByLabelText(/itens para ganhar/i);
    expect(within(previa()).getByText('Junte 10, ganhe 1 grátis')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, '8');

    expect(within(previa()).getByText('Junte 8, ganhe 1 grátis')).toBeInTheDocument();
    expect(previa().querySelectorAll('[data-carimbo]')).toHaveLength(8);
  });

  it('no cashback, a prévia acompanha a porcentagem digitada', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('radio', { name: /Cashback/i }));
    const input = await screen.findByLabelText(/volta em cada compra/i);
    expect(within(previa()).getByText('3% de volta em cada pedido')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, '5');

    expect(within(previa()).getByText('5% de volta em cada pedido')).toBeInTheDocument();
  });

  it('os números do programa ficam sob a prévia', async () => {
    renderPage();
    const resumo = await screen.findByRole('region', { name: /como está o programa/i });
    await waitFor(() => expect(within(resumo).getByText('84')).toBeInTheDocument());
    expect(within(resumo).getByText('Participantes')).toBeInTheDocument();
    expect(within(resumo).getByText('A um item de ganhar')).toBeInTheDocument();
    expect(within(resumo).getByText('9')).toBeInTheDocument();
    expect(within(resumo).getByText('Brindes a resgatar')).toBeInTheDocument();
    expect(within(resumo).getByText('6')).toBeInTheDocument();
    expect(within(resumo).getByText('Brindes entregues')).toBeInTheDocument();
    expect(within(resumo).getByText('14')).toBeInTheDocument();
  });

  it('o formulário tem as seções em frase', async () => {
    renderPage();
    await screen.findByLabelText(/itens para ganhar/i);
    expect(screen.getByRole('heading', { name: 'Como o cliente ganha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O que ele recebe' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Onde vale' })).toBeInTheDocument();
  });
});

describe('salvar diz o que faz', () => {
  it('o botão diz "Salvar programa" e o aviso repete o verbo', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar programa' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Programa salvo'));
  });

  it('se falhar, o aviso traz a mensagem do servidor', async () => {
    (updateStore as jest.Mock).mockRejectedValue({ response: { data: { detail: 'Sem permissão.' } } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar programa' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sem permissão.'));
  });

  it('o cashback salva com o próprio verbo', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    await userEvent.click(await screen.findByRole('radio', { name: /Cashback/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar cashback' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Cashback salvo'));
  });
});
