/**
 * A página da loja (Todas as lojas → uma loja) era uma terceira navegação:
 * abas que só navegavam, "Ações rápidas" repetindo o menu, um "Editar" que
 * abria um modal com um link, e "Desativar" sem confirmação (26/10).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const getStore = jest.fn();
const getStoreStats = jest.fn();
const deactivateStore = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  default: {
    getStore: (...a: unknown[]) => getStore(...a),
    getStoreStats: (...a: unknown[]) => getStoreStats(...a),
    deactivateStore: (...a: unknown[]) => deactivateStore(...a),
    activateStore: jest.fn(),
  },
}));
const rootStore = { setSelectedStore: jest.fn() };
jest.mock('../../../stores/rootStore', () => ({ useRootStore: () => rootStore }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { StoreDetailPage } from '../StoreDetailPage';

const loja = {
  id: 'u1', slug: 'ce', name: 'Cê Saladas', status: 'active', email: 'a@b.c', phone: '', whatsapp_number: '',
  address: 'Quadra 1', city: 'Palmas', state: 'TO', delivery_enabled: true, pickup_enabled: false,
  products_count: 10, orders_count: 5,
};
const stats = {
  revenue: { total: 100, today: 10 }, orders: { total: 5, today: 1 },
  products: { total: 10, active: 8 }, customers: { total: 3 },
};

const tela = () => render(
  <MemoryRouter initialEntries={['/stores/ce']}>
    <Routes><Route path="/stores/:storeId" element={<StoreDetailPage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  getStore.mockResolvedValue(loja);
  getStoreStats.mockResolvedValue(stats);
  deactivateStore.mockReset().mockResolvedValue({});
});

it('não repete o menu: sem abas, sem ações rápidas, sem modal de editar', async () => {
  tela();
  await screen.findByRole('heading', { name: 'Cê Saladas' });
  expect(screen.queryByRole('button', { name: /Visão Geral/ })).toBeNull();
  expect(screen.queryByText('Ações Rápidas')).toBeNull();
  expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
  expect(screen.getByRole('link', { name: /Configurações da loja/ })).toHaveAttribute('href', '/stores/ce/settings');
});

it('desativar pede confirmação antes de tirar a loja do ar', async () => {
  tela();
  fireEvent.click(await screen.findByRole('button', { name: /Desativar/ }));
  expect(deactivateStore).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Desativar loja' }));
  await waitFor(() => expect(deactivateStore).toHaveBeenCalledWith('u1'));
});
