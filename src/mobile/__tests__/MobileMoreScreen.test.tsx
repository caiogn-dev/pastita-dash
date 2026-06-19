import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useRootStore } from '../../stores/rootStore';
import { MobileMoreScreen } from '../screens/MobileMoreScreen';

function renderScreen() {
  return render(<MemoryRouter><MobileMoreScreen /></MemoryRouter>);
}

test('store-scoped links resolve with the selected store', () => {
  useRootStore.setState({ selectedStoreId: 's1', stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }] } as never);
  renderScreen();
  expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/stores/s1/customers');
  expect(screen.getByRole('link', { name: /produtos/i })).toHaveAttribute('href', '/stores/s1/products');
  expect(screen.getByRole('link', { name: /conversas/i })).toHaveAttribute('href', '/inbox');
  expect(screen.getByRole('link', { name: /configura/i })).toHaveAttribute('href', '/settings');
});

test('disables store-scoped items when no store is selected', () => {
  useRootStore.setState({ selectedStoreId: null, stores: [] } as never);
  renderScreen();
  expect(screen.queryByRole('link', { name: /clientes/i })).not.toBeInTheDocument();
  expect(screen.getByText(/selecione uma loja primeiro/i)).toBeInTheDocument();
});
