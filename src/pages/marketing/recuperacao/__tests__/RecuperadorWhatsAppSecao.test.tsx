import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }));
const salvarLoja = jest.fn();
jest.mock('../../../../services/storesApi', () => ({ __esModule: true, updateStore: (...a: unknown[]) => salvarLoja(...a) }));
let mockLoja: { id: string; slug: string; metadata: Record<string, unknown> } = { id: 's1', slug: 'loja-x', metadata: {} };
jest.mock('../../../../hooks/useStore', () => ({ __esModule: true, useStore: () => ({ storeId: mockLoja.id, storeSlug: mockLoja.slug, store: mockLoja }) }));

import { RecuperadorWhatsAppSecao, lerRecuperador } from '../RecuperadorWhatsAppSecao';
import { useRootStore } from '../../../../stores/rootStore';

beforeEach(() => {
  jest.clearAllMocks();
  mockLoja = { id: 's1', slug: 'loja-x', metadata: { respostas_rapidas: [] } };
  act(() => useRootStore.getState().setStores([mockLoja as never]));
  salvarLoja.mockImplementation(async (_id: string, dados: { metadata: Record<string, unknown> }) => ({ ...mockLoja, metadata: dados.metadata }));
});

it('quem só perguntou nasce desligado; ligar grava no metadata sem apagar o resto', async () => {
  render(<RecuperadorWhatsAppSecao />);
  const sw = screen.getByRole('switch', { name: /quem só perguntou/i });
  expect(sw).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(sw);
  await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
  const meta = salvarLoja.mock.calls[0][1].metadata;
  expect(meta.respostas_rapidas).toEqual([]);
  expect(meta.recuperador.perguntou.ativo).toBe(true);
  expect(meta.recuperador.perguntou.apos_horas).toBe(3);
  expect(meta.recuperador.carrinho.incluir_oferta).toBe(true);
});

it('lerRecuperador aplica limites', () => {
  expect(lerRecuperador({ recuperador: { perguntou: { apos_horas: 99, texto: '  ' } } }).perguntou.apos_horas).toBe(20);
  expect(lerRecuperador(undefined).perguntou.texto).toMatch(/dúvida/);
});
