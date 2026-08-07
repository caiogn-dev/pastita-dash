import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mobile = true;
jest.mock('../../../mobile/useIsMobileViewport', () => ({ useIsMobileViewport: () => mobile }));
jest.mock('../../../mobile/MobileShell', () => ({ MobileShell: () => <div data-testid="mobile-shell" /> }));
jest.mock('../Navbar', () => ({ Navbar: () => <div data-testid="desktop-navbar" /> }));
jest.mock('../TrialBanner', () => ({ TrialBanner: () => null }));
// A casca do desktop passou a montar a coluna lateral, que puxa `useStore` →
// `config/storeConfig` → `import.meta.env`, sintaxe que este runner não parseia.
// Este teste é sobre o portão mobile/desktop; a navegação tem os testes dela.
jest.mock('../Sidebar', () => ({ Sidebar: () => <div data-testid="desktop-sidebar" /> }));
jest.mock('../useNavSections', () => ({ useNavSections: () => [] }));

import { useAuthStore } from '../../../stores/authStore';
import { MainLayout } from '../MainLayout';

function renderAt(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><MainLayout /></MemoryRouter>);
}

beforeEach(() => { mobile = true; });

test('renders the mobile shell when authenticated on a phone viewport', () => {
  useAuthStore.setState({ isAuthenticated: true, token: 't', user: { id: '1' } } as never);
  renderAt('/');
  expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
  expect(screen.queryByTestId('desktop-navbar')).not.toBeInTheDocument();
});

test('renders desktop chrome (no mobile shell) when not authenticated', () => {
  useAuthStore.setState({ isAuthenticated: false, token: null, user: null } as never);
  renderAt('/');
  expect(screen.queryByTestId('mobile-shell')).not.toBeInTheDocument();
  expect(screen.getByTestId('desktop-navbar')).toBeInTheDocument();
});
