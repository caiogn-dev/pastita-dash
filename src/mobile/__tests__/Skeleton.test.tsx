import { render, screen } from '@testing-library/react';
import { SkeletonList } from '../ui/Skeleton';

test('renders the requested number of skeleton cards', () => {
  render(<SkeletonList count={3} />);
  expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
});
