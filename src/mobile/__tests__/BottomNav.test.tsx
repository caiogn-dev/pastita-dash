// src/mobile/__tests__/BottomNav.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../BottomNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

test('renders the four tabs', () => {
  renderAt('/?tab=pedidos');
  expect(screen.getByRole('button', { name: /pedidos/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /novo/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cozinha/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mais/i })).toBeInTheDocument();
});

test('marks the active tab from the search param', () => {
  renderAt('/?tab=cozinha');
  expect(screen.getByRole('button', { name: /cozinha/i })).toHaveAttribute('aria-current', 'page');
});

test('defaults active tab to pedidos at root with no param', () => {
  renderAt('/');
  expect(screen.getByRole('button', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page');
});
