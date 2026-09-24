import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import api from '../../../services/api';
import TabelaDeCustos from '../TabelaDeCustos';

const apiGet = api.get as jest.Mock;

const linhas = [
  { produto_id: 'p1', produto: 'Camarão', preco_de_venda: '30.00', custo_total: '20.00', custo_por_porcao: '10.00',
    margem_bruta_valor: '10.00', margem_bruta_pct: '33.3', cmv_pct: '66.7', ingredientes_sem_preco: [], completo: true },
  { produto_id: 'p2', produto: 'Com molho', preco_de_venda: '25.00', custo_total: null, custo_por_porcao: null,
    margem_bruta_valor: null, margem_bruta_pct: null, cmv_pct: null, ingredientes_sem_preco: ['Molho'], completo: false },
];

beforeEach(() => apiGet.mockReset());

test('lê o resumo da loja e mostra na ordem do servidor (pior margem primeiro)', async () => {
  apiGet.mockResolvedValue({ data: linhas });
  render(<TabelaDeCustos storeUuid="s1" />);
  await waitFor(() => expect(screen.getAllByText('Camarão').length).toBeGreaterThan(0));
  expect(apiGet).toHaveBeenCalledWith('/nutrition/custos/', { params: { store: 's1' } });
  expect(screen.getAllByText(/33,3\s?%/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/sem preço: Molho/).length).toBeGreaterThan(0);
});

test('falha não vira "nenhum prato": mostra o erro e deixa tentar de novo', async () => {
  apiGet.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce({ data: linhas });
  render(<TabelaDeCustos storeUuid="s1" />);
  await waitFor(() => expect(screen.getByText(/Não foi possível carregar/)).toBeInTheDocument());
  expect(screen.queryByText(/Nenhum prato/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
  await waitFor(() => expect(screen.getAllByText('Camarão').length).toBeGreaterThan(0));
});

test('loja sem receita mostra o vazio com o caminho', async () => {
  apiGet.mockResolvedValue({ data: [] });
  render(<TabelaDeCustos storeUuid="s1" />);
  await waitFor(() => expect(screen.getByText(/Nenhum prato com receita/)).toBeInTheDocument());
});
