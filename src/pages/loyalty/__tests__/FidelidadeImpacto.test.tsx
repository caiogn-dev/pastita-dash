/**
 * O impacto do programa mora na coluna da direita, ACIMA da prévia, e segue o
 * que o dono digita. Sem o endpoint (painel à frente do backend) a tela diz
 * "sem dados ainda" em vez de quebrar.
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
jest.mock('../../../services/loyaltyImpacto', () => ({
  loyaltyImpactoService: { get: jest.fn() },
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
import { loyaltyImpactoService } from '../../../services/loyaltyImpacto';
import { getStores, getCategories } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const impacto = {
  janela_dias: 90, pedidos_pagos: 180, ticket_medio: 48.5, pedidos_por_mes: 60,
  receita_paga_mes: 18400, amostra_suficiente: true, pedidos_faltando: 0, participantes: 122,
  taxa_recompra_participantes: 0.48, taxa_recompra_nao_participantes: 0.22,
  itens_para_ganhar: 10, carimbos_por_mes: 90, brindes_por_mes_projetados: 9,
  custo_por_brinde: 27, custo_por_brinde_origem: 'resgates', custo_projetado_mes: 243,
  cashback_percentual: 3, saldo_gerado_mes: 552, a_um_item_total: 2,
  a_um_item: [{ id: '1', nome: 'Nair', telefone: '55*******1111', faltam: 1 }],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/fidelidade']}>
      <Routes>
        <Route path="/stores/:storeId/fidelidade" element={<FidelidadePage />} />
      </Routes>
    </MemoryRouter>,
  );

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');
const coluna = () => screen.getByRole('complementary', { name: /prévia e números do programa/i });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (getStores as jest.Mock).mockResolvedValue(page([store]));
  (getCategories as jest.Mock).mockResolvedValue(page([]));
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({ count: 0, results: [] });
  (cashbackService.get as jest.Mock).mockResolvedValue({
    enabled: false, percent: '3', referral_percent: '5', expiry_days: 60,
    resumo: { saldo_em_circulacao: '0.00', ja_resgatado: '0.00', clientes_com_saldo: 0,
      saldo_de_indicacao: '0.00', vence_em_7_dias: '0.00' },
    count: 0, results: [],
  });
  (loyaltyImpactoService.get as jest.Mock).mockResolvedValue(impacto);
});

it('pede o impacto pelo slug da loja e mostra acima da prévia', async () => {
  renderPage();
  const simulador = await screen.findByTestId('simulador');
  await waitFor(() => expect(norm(simulador.textContent)).toContain('~9 brindes/mês'));
  expect(loyaltyImpactoService.get).toHaveBeenCalledWith('ce-saladas');

  const secao = within(coluna()).getByRole('region', { name: /quanto custa e se está funcionando/i });
  const previa = within(coluna()).getByRole('figure', { name: /como o cliente vê/i });
  // eslint-disable-next-line no-bitwise
  expect(secao.compareDocumentPosition(previa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('o simulador acompanha os itens digitados no formulário', async () => {
  renderPage();
  const simulador = await screen.findByTestId('simulador');
  await waitFor(() => expect(norm(simulador.textContent)).toContain('~9 brindes/mês'));

  const input = screen.getByLabelText(/itens para ganhar/i);
  await userEvent.clear(input);
  await userEvent.type(input, '5');
  expect(norm(simulador.textContent)).toContain('~18 brindes/mês');
});

it('backend sem o endpoint: "sem dados ainda", e a página continua de pé', async () => {
  (loyaltyImpactoService.get as jest.Mock).mockResolvedValue(null);
  renderPage();
  const simulador = await screen.findByTestId('simulador');
  await waitFor(() => expect(simulador).toHaveTextContent(/sem dados ainda/i));
  expect(screen.getByLabelText(/itens para ganhar/i)).toBeInTheDocument();
});

it('erro de rede também vira "sem dados ainda"', async () => {
  (loyaltyImpactoService.get as jest.Mock).mockRejectedValue(new Error('rede'));
  renderPage();
  const simulador = await screen.findByTestId('simulador');
  await waitFor(() => expect(simulador).toHaveTextContent(/sem dados ainda/i));
});

it('mostra a ação de avisar quem está a um item', async () => {
  renderPage();
  expect(await screen.findByText(/2 clientes a um item do brinde/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /avisar pelo whatsapp/i })).toBeInTheDocument();
});
