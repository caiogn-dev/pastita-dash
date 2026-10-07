/**
 * Gaveta de navegação (768–1023px, onde a coluna lateral ainda não existe).
 *
 * Medido no Chromium a 900px: com a gaveta aberta, Esc não fazia nada e o
 * foco ficava no botão de hambúrguer, ATRÁS do véu — quem navega por teclado
 * tabulava pela página escurecida sem alcançar o menu, e não tinha como
 * fechá-lo. Toda outra camada do painel (paleta, seletor de loja, modal)
 * fecha com Esc.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// A Navbar usa `React.Fragment` pelo import default; sem esModuleInterop o
// ts-jest entrega `undefined` nele. O Vite resolve igual nos dois casos.
jest.mock('react', () => {
  const real = jest.requireActual('react');
  return { __esModule: true, ...real, default: real };
});
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ store: null }) }));
jest.mock('../../../stores/chatStore', () => ({ useWsConnected: () => true }));
jest.mock('../../../stores/accountStore', () => ({
  useAccountStore: () => ({ accounts: [], selectedAccount: null, setSelectedAccount: jest.fn() }),
}));
jest.mock('../StoreSelector', () => ({ StoreSelector: () => null }));
jest.mock('../CentralDePedidosLink', () => ({ CentralDePedidosLink: () => null }));
jest.mock('../../theme', () => ({ ThemeToggle: () => null }));
jest.mock('../../notifications', () => ({ NotificationDropdown: () => null }));
jest.mock('../AccountMenu', () => ({ AccountMenu: () => null, ACCOUNT_LINKS: [] }));
jest.mock('../useNavSections', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildNavSections } = require('../navSections');
  return {
    useNavSections: () =>
      buildNavSections({ storeHref: (p: string) => `/stores/loja/${p}`, automationEnabled: false }),
  };
});

import { Navbar } from '../Navbar';

const abrirGaveta = () => {
  render(
    <MemoryRouter>
      <Navbar semNavegacaoDesktop />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: /abrir menu de navegação/i }));
};

it('a gaveta se anuncia como diálogo modal', () => {
  abrirGaveta();
  expect(screen.getByRole('dialog', { name: /navegação/i })).toHaveAttribute('aria-modal', 'true');
});

it('Esc fecha a gaveta', () => {
  abrirGaveta();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('ao abrir, o foco entra na gaveta; ao fechar, volta ao hambúrguer', () => {
  abrirGaveta();
  expect(screen.getByRole('button', { name: /fechar menu de navegação/i })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('button', { name: /abrir menu de navegação/i })).toHaveFocus();
});
