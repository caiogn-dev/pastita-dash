import { render, screen, fireEvent } from '@testing-library/react';
import { PushOptInBanner } from '../PushOptInBanner';

const mockState = {
  permission: 'default' as string,
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

jest.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockState,
}));

beforeEach(() => {
  mockState.permission = 'default';
  mockState.isSubscribed = false;
  mockState.error = null;
  mockState.subscribe = jest.fn();
  localStorage.clear();
});

test('shows opt-in and calls subscribe on click', () => {
  render(<PushOptInBanner />);
  fireEvent.click(screen.getByRole('button', { name: /ativar notifica/i }));
  expect(mockState.subscribe).toHaveBeenCalled();
});

test('renders nothing when already subscribed', () => {
  mockState.isSubscribed = true;
  const { container } = render(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing when permission is denied', () => {
  mockState.permission = 'denied';
  const { container } = render(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
});

test('persists dismissal across remounts', () => {
  localStorage.clear();
  const { rerender, container } = render(<PushOptInBanner />);
  fireEvent.click(screen.getByRole('button', { name: /dispensar/i }));
  rerender(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
  expect(localStorage.getItem('cdx_push_dismissed')).toBe('1');
});

test('shows the hook error message when present', () => {
  mockState.error = 'falhou';
  render(<PushOptInBanner />);
  expect(screen.getByText('falhou')).toBeInTheDocument();
});
