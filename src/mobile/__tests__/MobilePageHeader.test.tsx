// src/mobile/__tests__/MobilePageHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
const navigate = jest.fn();
let mockLocation: { pathname: string; key: string } = {
  pathname: '/stores/s1/customers',
  key: 'default',
};
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
  useLocation: () => mockLocation,
}));
import { MobilePageHeader } from '../MobilePageHeader';

beforeEach(() => {
  navigate.mockClear();
  mockLocation = { pathname: '/stores/s1/customers', key: 'default' };
});

test('deep-link direto (primeira entrada): voltar cai na aba Mais', () => {
  render(<MobilePageHeader />);
  fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
  expect(navigate).toHaveBeenCalledWith('/?tab=mais');
});

test('com histórico na sessão: voltar respeita o histórico (navigate(-1))', () => {
  mockLocation = { pathname: '/stores/s1/customers', key: 'abc123' };
  render(<MobilePageHeader />);
  fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
  expect(navigate).toHaveBeenCalledWith(-1);
});

test('shows a title derived from the route', () => {
  render(<MobilePageHeader />);
  expect(screen.getByText('Clientes')).toBeInTheDocument();
});
