import { render, screen, fireEvent } from '@testing-library/react';

const getStores = jest.fn();
jest.mock('../../../services/storesApi', () => ({ getStores: (...a: unknown[]) => getStores(...a) }));

import { useRootStore } from '../../../stores/rootStore';
import { StoreSelector } from '../StoreSelector';

beforeEach(() => {
  getStores.mockResolvedValue({ results: [] });
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
});

test('renders options from the store WITHOUT fetching', () => {
  render(<StoreSelector />);
  expect(screen.getByRole('option', { name: 'Loja 1' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Loja 2' })).toBeInTheDocument();
  expect(getStores).not.toHaveBeenCalled();
});

test('changing the select updates the selected store', () => {
  render(<StoreSelector />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 's2' } });
  expect(useRootStore.getState().selectedStoreId).toBe('s2');
});
