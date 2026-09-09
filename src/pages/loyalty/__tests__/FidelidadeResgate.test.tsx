/**
 * Marcar/desfazer resgate direto na linha da Fidelidade.
 *
 * A tela mostrava "3 grátis disponíveis" e não oferecia nenhuma forma de dizer
 * que dois já tinham sido entregues pelo WhatsApp: em produção havia 161
 * créditos e ZERO resgates. Era um relatório, não uma ferramenta.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

import { cashbackService } from '../../../services/cashback';
import { loyaltyService } from '../../../services/loyalty';
import { getStores, getCategories } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

// O caso real: 32 saladas, 0 resgates gravados, 3 brindes "disponíveis".
const ALINE = {
  user_id: '11790', display_name: 'Aline Nasche', email: 'aline28_06@yahoo.com.br',
  qualified_count: 32, redeemed_count: 0, progress: 2, available_rewards: 3,
  falta: 8, updated_at: '2026-09-08T00:00:00Z',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/fidelidade']}>
      <Routes>
        <Route path="/stores/:storeId/fidelidade" element={<FidelidadePage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (getStores as jest.Mock).mockResolvedValue(page([store]));
  (getCategories as jest.Mock).mockResolvedValue(page([]));
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({ count: 1, results: [ALINE] });
  (cashbackService.get as jest.Mock).mockResolvedValue({
    enabled: false, percent: '3', referral_percent: '5', expiry_days: 60,
    resumo: {
      saldo_em_circulacao: '0.00', ja_resgatado: '0.00', clientes_com_saldo: 0,
      saldo_de_indicacao: '0.00', vence_em_7_dias: '0.00',
      saldo_pago_pelo_cliente: '0.00', saldo_concedido_pela_loja: '0.00', por_origem: {},
    },
    count: 0, results: [],
  });
});

/** A `Tabela` desenha a MESMA linha duas vezes: `<table>` no desktop e
 *  cartões no celular. Ancorar na `<tr>` evita o "found multiple elements". */
const linhaDaAline = async (nome = 'Aline Nasche') => {
  const achados = await screen.findAllByText(nome);
  const linha = achados.map((n) => n.closest('tr')).find(Boolean);
  return linha as HTMLElement;
};

it('marca resgate na linha e atualiza o disponível sem recarregar a página', async () => {
  (loyaltyService.resgatarBrinde as jest.Mock).mockResolvedValue({
    user_id: '11790', qualified_count: 32, redeemed_count: 1, progress: 2, available_rewards: 2,
  });
  renderPage();
  const linha = await linhaDaAline();
  await userEvent.click(within(linha).getByRole('button', { name: /marcar resgate/i }));

  await waitFor(() => expect(loyaltyService.resgatarBrinde).toHaveBeenCalledWith(
    'ce-saladas', '11790', 1,
  ));
  await waitFor(() => expect(within(linha).getByText('2')).toBeInTheDocument());
});

it('desfaz um resgate registrado por engano', async () => {
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 1, results: [{ ...ALINE, redeemed_count: 2, available_rewards: 1 }],
  });
  (loyaltyService.resgatarBrinde as jest.Mock).mockResolvedValue({
    user_id: '11790', qualified_count: 32, redeemed_count: 1, progress: 2, available_rewards: 2,
  });
  renderPage();
  const linha = await linhaDaAline();
  await userEvent.click(within(linha).getByRole('button', { name: /desfazer resgate/i }));

  await waitFor(() => expect(loyaltyService.resgatarBrinde).toHaveBeenCalledWith(
    'ce-saladas', '11790', -1,
  ));
});

it('não oferece marcar resgate para quem não tem brinde', async () => {
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 1, results: [{ ...ALINE, qualified_count: 7, progress: 7, available_rewards: 0, redeemed_count: 0 }],
  });
  renderPage();
  const linha = await linhaDaAline();
  expect(within(linha).queryByRole('button', { name: /marcar resgate/i })).toBeNull();
  // Sem resgate nenhum registrado, também não há o que desfazer.
  expect(within(linha).queryByRole('button', { name: /desfazer resgate/i })).toBeNull();
});

it('mostra o telefone em vez do e-mail fabricado pelo backend', async () => {
  // 30 das 84 contas da Cê Saladas exibiam '84056261@local.invalid' cru.
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 1, results: [{ ...ALINE, display_name: 'Nair', email: '84689350@local.invalid', phone: '5563984689350' }],
  });
  renderPage();
  await linhaDaAline('Nair');
  expect(screen.queryByText(/local\.invalid/)).toBeNull();
});
