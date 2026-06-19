import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useRootStore } from '../../stores/rootStore';
import { MobileMoreScreen } from '../screens/MobileMoreScreen';

beforeEach(() => {
  useRootStore.setState({ selectedStoreId: 's1' });
});

test('lists links to the secondary sections with store-scoped hrefs', () => {
  render(
    <MemoryRouter>
      <MobileMoreScreen />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/stores/s1/customers');
  expect(screen.getByRole('link', { name: /produtos/i })).toHaveAttribute('href', '/stores/s1/products');
  expect(screen.getByRole('link', { name: /conversas/i })).toHaveAttribute('href', '/inbox');
  expect(screen.getByRole('link', { name: /configurações/i })).toHaveAttribute('href', '/settings');
});

test('falls back to /stores when selectedStoreId is null', () => {
  useRootStore.setState({ selectedStoreId: null });
  render(
    <MemoryRouter>
      <MobileMoreScreen />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/stores');
  expect(screen.getByRole('link', { name: /produtos/i })).toHaveAttribute('href', '/stores');
});
