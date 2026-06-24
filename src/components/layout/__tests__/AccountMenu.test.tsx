import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountMenu } from '../AccountMenu';

const mockLogout = jest.fn();
const mockNavigate = jest.fn();
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({ user: { first_name: 'Caio', username: 'caio' }, logout: mockLogout }),
}));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ store: { name: 'Cê Saladas' } }) }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  mockLogout.mockReset();
  mockNavigate.mockReset();
});

function renderMenu() {
  return render(<MemoryRouter><AccountMenu /></MemoryRouter>);
}

it('reveals account links when the avatar is clicked', () => {
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: /conta/i }));
  expect(screen.getByText('Todas as Lojas')).toBeInTheDocument();
  expect(screen.getByText('Preferências')).toBeInTheDocument();
  expect(screen.getByText('Plano')).toBeInTheDocument();
  expect(screen.getByText('Sair')).toBeInTheDocument();
});

it('calls logout and redirects to /login when "Sair" is clicked', () => {
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: /conta/i }));
  fireEvent.click(screen.getByText('Sair'));
  expect(mockLogout).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/login');
});

it('closes the menu after "Sair" is clicked', () => {
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: /conta/i }));
  fireEvent.click(screen.getByText('Sair'));
  expect(screen.queryByText('Todas as Lojas')).not.toBeInTheDocument();
});
