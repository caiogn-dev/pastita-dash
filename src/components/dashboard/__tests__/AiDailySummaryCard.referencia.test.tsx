/**
 * Comparação com a média no Início (06/11): uma média só, com a janela escrita.
 * O vigia dizia "36% acima da média das últimas 4 quintas" e o resumo da IA
 * "bem abaixo da média de quinta (R$ 672,03)" — agora os dois usam a média
 * de referência do servidor, e o card mostra qual é.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AiDailySummaryCard } from '../AiDailySummaryCard';

jest.mock('../../../services/ai', () => ({ __esModule: true, aiService: { getDailySummary: jest.fn() } }));
jest.mock('../../../hooks/queries/useAiDailySummary', () => ({
  __esModule: true,
  aiDailySummaryQueryKey: (s: string) => ['ai', s],
  useAiDailySummary: () => ({
    isLoading: false,
    isError: false,
    data: {
      stats: { orders: 10, revenue: 500, avg_ticket: 50, peak_hour: 12, cancelled: 0, top_products: [] },
      blocos: [{ tipo: 'resultado', titulo: 'Ontem', texto: 'Foi bem.' }],
      summary: 'Foi bem.',
      source: 'llm',
      cached: false,
      referencia: { receita: 672.03, janela: 'últimas 4 quintas', dias: [], variacao_pct: -26 },
    },
  }),
}));

it('mostra a média de referência com a janela', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AiDailySummaryCard store="loja" />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Média das últimas 4 quintas')).toBeInTheDocument();
  expect(screen.getByText(/672,03/)).toBeInTheDocument();
});
