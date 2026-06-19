// src/mobile/__tests__/MobileTopBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useRootStore } from '../../stores/rootStore';
import { MobileTopBar } from '../MobileTopBar';

test('shows active store name and opens switcher when multiple stores', () => {
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
  render(<MobileTopBar />);
  fireEvent.click(screen.getByRole('button', { name: /loja 1/i }));
  expect(screen.getByText('Trocar de loja')).toBeInTheDocument();
});

test('single store renders name without a switch button', () => {
  useRootStore.setState({ stores: [{ id: 's1', name: 'Só Loja', slug: 'l1' }], selectedStoreId: 's1' } as never);
  render(<MobileTopBar />);
  expect(screen.getByText('Só Loja')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /só loja/i })).not.toBeInTheDocument();
});
