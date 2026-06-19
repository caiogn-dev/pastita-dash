// src/mobile/__tests__/InstallBanner.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

const state = { canInstall: true, promptInstall: jest.fn(), isIOS: false, isStandalone: false };
jest.mock('../useInstallPrompt', () => ({ useInstallPrompt: () => state }));

import { InstallBanner } from '../InstallBanner';

beforeEach(() => {
  state.canInstall = true; state.isStandalone = false; state.isIOS = false; state.promptInstall = jest.fn();
  localStorage.clear();
});

test('shows install CTA and triggers prompt', () => {
  render(<InstallBanner />);
  fireEvent.click(screen.getByRole('button', { name: /instalar/i }));
  expect(state.promptInstall).toHaveBeenCalled();
});

test('hides after dismiss and persists', () => {
  const { rerender } = render(<InstallBanner />);
  fireEvent.click(screen.getByRole('button', { name: /dispensar/i }));
  rerender(<InstallBanner />);
  expect(screen.queryByText(/instalar/i)).not.toBeInTheDocument();
  expect(localStorage.getItem('cdx_install_dismissed')).toBe('1');
});

test('renders nothing when already standalone', () => {
  state.isStandalone = true;
  const { container } = render(<InstallBanner />);
  expect(container).toBeEmptyDOMElement();
});
