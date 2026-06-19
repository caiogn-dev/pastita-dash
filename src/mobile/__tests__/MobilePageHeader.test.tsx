// src/mobile/__tests__/MobilePageHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
const navigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/stores/s1/customers' }),
}));
import { MobilePageHeader } from '../MobilePageHeader';

test('back button navigates to the Mais tab', () => {
  render(<MobilePageHeader />);
  fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
  expect(navigate).toHaveBeenCalledWith('/?tab=mais');
});

test('shows a title derived from the route', () => {
  render(<MobilePageHeader />);
  expect(screen.getByText('Clientes')).toBeInTheDocument();
});
