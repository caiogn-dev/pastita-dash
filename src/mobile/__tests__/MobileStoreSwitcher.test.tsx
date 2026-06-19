import { render, screen, fireEvent } from '@testing-library/react';
import { useRootStore } from '../../stores/rootStore';
import { MobileStoreSwitcher } from '../MobileStoreSwitcher';

beforeEach(() => {
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
});

test('lists stores and selecting one updates + closes', () => {
  const onClose = jest.fn();
  render(<MobileStoreSwitcher open onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: /loja 2/i }));
  expect(useRootStore.getState().selectedStoreId).toBe('s2');
  expect(onClose).toHaveBeenCalled();
});
