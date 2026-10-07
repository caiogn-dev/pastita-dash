import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../hooks', () => ({
  useStore: () => ({
    storeId: 'store-ce',
    storeName: 'Cê Saladas',
    stores: [{ id: 'store-ce', name: 'Cê Saladas', slug: 'ce-saladas' }],
  }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const getCombos = jest.fn(async () => ({ results: [], count: 0, next: null, previous: null }));
jest.mock('../services/storesApi', () => ({
  __esModule: true,
  default: { updateCombo: jest.fn(), getProducts: jest.fn(async () => ({ results: [] })) },
  getCombos: (...a: unknown[]) => getCombos(...(a as [])),
  deleteCombo: jest.fn(),
  getCombo: jest.fn(),
  createComboWithItems: jest.fn(),
  updateComboWithItems: jest.fn(),
  uploadComboImage: jest.fn(),
}));

import { ComboListPage } from '../pages/stores/combos/ComboListPage';

// 03/10: /stores/agriao-comida-saudavel/combos, numa conta sem a Agrião,
// listava os combos da Cê (a loja do topo) sob a URL da Agrião.
it('loja da URL que a conta não tem não cai na loja do topo', () => {
  render(
    <MemoryRouter initialEntries={['/stores/agriao-comida-saudavel/combos']}>
      <Routes>
        <Route path="/stores/:storeId/combos" element={<ComboListPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Loja não encontrada nesta conta')).toBeInTheDocument();
  expect(getCombos).not.toHaveBeenCalled();
});
