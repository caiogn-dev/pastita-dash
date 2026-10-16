/** Início → cartão dos vigias: vende quando desligado, mostra o último dia quando ligado. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));
const painel = jest.fn();
const avisos = jest.fn();
jest.mock('../../../services/vigias', () => ({
  __esModule: true,
  vigiasService: { painel: (...a: unknown[]) => painel(...a), avisos: (...a: unknown[]) => avisos(...a) },
}));

import { VigiasDoDiaCard } from '../VigiasDoDiaCard';

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><VigiasDoDiaCard store="ce-saladas" /></MemoryRouter>
  </QueryClientProvider>,
);

const aviso = (id: string, criado: string) => ({ id, tipo: 'resumo', titulo: `T${id}`, texto: `texto ${id}`, prioridade: 5, dados: {}, util: null, criado_em: criado, envio: null });

beforeEach(() => jest.clearAllMocks());

it('desligado: convida a ligar', async () => {
  painel.mockResolvedValue({ config: { ativo: false } });
  renderizar();
  expect(await screen.findByRole('link', { name: /Ligar/ })).toHaveAttribute('href', '/vigias');
  expect(avisos).not.toHaveBeenCalled();
});

it('ligado: mostra só os avisos do último dia, no máximo três', async () => {
  painel.mockResolvedValue({ config: { ativo: true } });
  avisos.mockResolvedValue([
    aviso('1', '2026-10-16T11:00:00Z'), aviso('2', '2026-10-16T11:00:00Z'),
    aviso('3', '2026-10-16T11:00:00Z'), aviso('4', '2026-10-16T11:00:00Z'),
    aviso('5', '2026-10-15T11:00:00Z'),
  ]);
  renderizar();
  expect(await screen.findByText('texto 1')).toBeInTheDocument();
  expect(screen.getByText('texto 3')).toBeInTheDocument();
  expect(screen.queryByText('texto 4')).not.toBeInTheDocument();
  expect(screen.queryByText('texto 5')).not.toBeInTheDocument();
});

it('ligado sem aviso diz que não há nada, e erro some com o cartão', async () => {
  painel.mockResolvedValue({ config: { ativo: true } });
  avisos.mockResolvedValue([]);
  const { unmount } = renderizar();
  expect(await screen.findByText('Nada a avisar por enquanto.')).toBeInTheDocument();
  unmount();
  painel.mockRejectedValue(new Error('rede'));
  const { container } = renderizar();
  await new Promise((r) => setTimeout(r, 20));
  expect(container).toBeEmptyDOMElement();
});
