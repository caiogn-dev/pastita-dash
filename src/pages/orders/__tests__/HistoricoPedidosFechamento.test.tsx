/**
 * "Como entrou o dinheiro" precisa FECHAR com o faturamento na própria tela.
 *
 * Relato do dono em 17/set/2026: as formas de pagamento somavam R$ 5.277,59 e
 * o card ao lado dizia Faturamento R$ 4.626,75. Os dois números estavam
 * certos — a quebra é caixa (com frete, para bater com o extrato do gateway) e
 * o faturamento é venda da loja (sem frete, que é repasse ao entregador) — mas
 * a tela mostrava as duas somas e escondia a peça que as liga.
 *
 * Duas somas que não fecham, sem a conta à vista, leem como erro do sistema.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../services/storesApi');
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'ce-saladas', storeSlug: 'ce-saladas' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../components/orders/OrderDetailModal', () => ({
  OrderDetailModal: () => null,
}));

let resumoState: Record<string, unknown>;
jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: undefined,
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'historico-pedidos') {
      return { data: { results: [], count: 0 }, isLoading: false, isError: false, refetch: jest.fn() };
    }
    if (queryKey[0] === 'historico-resumo') return { ...resumoState, refetch: jest.fn() };
    return { data: undefined, isLoading: false, isError: false, refetch: jest.fn() };
  },
}));

import { HistoricoPedidosPage } from '../HistoricoPedidosPage';

/** Cê Saladas, 01–17/set/2026 — os números exatos do relato. */
const RESUMO_REAL = {
  pedidos: 93,
  cancelados: 12,
  pedidos_faturados: 81,
  faturamento: '4626.75',
  frete: '650.84',
  ticket_medio: '57.12',
  por_pagamento: [
    { chave: 'pix', pedidos: 66, total: '4334.09' },
    { chave: 'card', pedidos: 5, total: '538.29' },
    { chave: 'cash', pedidos: 10, total: '405.21' },
  ],
  por_canal: [],
  definicoes: {},
};

beforeEach(() => {
  resumoState = { data: RESUMO_REAL, isLoading: false, isError: false };
});

const renderPagina = () =>
  render(<MemoryRouter><HistoricoPedidosPage /></MemoryRouter>);

test('mostra o total recebido — a soma das formas de pagamento', () => {
  renderPagina();
  // 4.334,09 + 538,29 + 405,21
  expect(screen.getByText('R$ 5.277,59')).toBeInTheDocument();
});

test('mostra o frete como a diferença que liga caixa e faturamento', () => {
  renderPagina();
  // 5.277,59 − 650,84 = 4.626,75
  expect(screen.getByText(/R\$ 650,84/)).toBeInTheDocument();
  expect(screen.getByText(/repasse ao entregador/i)).toBeInTheDocument();
});

test('fecha no faturamento, o mesmo número do card ao lado', () => {
  renderPagina();
  // Aparece duas vezes de propósito: no KPI e no fecho da conta.
  expect(screen.getAllByText('R$ 4.626,75').length).toBeGreaterThanOrEqual(2);
});

test('sem frete no período, não inventa uma linha de desconto', () => {
  resumoState = {
    data: {
      ...RESUMO_REAL,
      frete: '0.00',
      faturamento: '5277.59',
      por_pagamento: RESUMO_REAL.por_pagamento,
    },
    isLoading: false,
    isError: false,
  };
  renderPagina();
  expect(screen.queryByText(/repasse ao entregador/i)).not.toBeInTheDocument();
});
