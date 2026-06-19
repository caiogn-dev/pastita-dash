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
  mockState.subscribe = jest.fn();
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
