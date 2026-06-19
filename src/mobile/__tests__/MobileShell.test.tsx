// src/mobile/__tests__/MobileShell.test.tsx
jest.mock('../screens/MobileOrdersScreen', () => ({ MobileOrdersScreen: () => <div data-testid="mobile-screen-pedidos" /> }));
jest.mock('../screens/MobileKdsScreen', () => ({ MobileKdsScreen: () => <div data-testid="mobile-screen-cozinha" /> }));

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MobileShell } from '../MobileShell';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MobileShell />}>
          <Route path="/customers" element={<div>Clientes desktop page</div>} />
          <Route path="/" element={<div>should-not-render-on-mobile-home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('renders the Pedidos screen at root by default', () => {
  renderAt('/');
  expect(screen.getByTestId('mobile-screen-pedidos')).toBeInTheDocument();
});

test('renders the Cozinha screen when tab=cozinha', () => {
  renderAt('/?tab=cozinha');
  expect(screen.getByTestId('mobile-screen-cozinha')).toBeInTheDocument();
});

test('renders the outlet (desktop page) on a secondary route', () => {
  renderAt('/customers');
  expect(screen.getByText('Clientes desktop page')).toBeInTheDocument();
});

test('always renders the bottom nav', () => {
  renderAt('/');
  expect(screen.getByRole('button', { name: /pedidos/i })).toBeInTheDocument();
});
