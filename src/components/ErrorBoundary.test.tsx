import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * TDD Tests for ErrorBoundary
 *
 * Requirements:
 * 1. Catch errors from child components
 * 2. Display error fallback UI instead of blank page
 * 3. Log error for debugging
 * 4. Allow reset/retry
 */

describe('ErrorBoundary', () => {
  const ThrowError = () => {
    throw new Error('Test error from child');
  };

  const WorkingComponent = () => <div>Works fine</div>;

  beforeEach(() => {
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Works fine')).toBeInTheDocument();
  });

  test('should catch error from child component', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show error message instead of crashing
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  test('should display error details in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Test error from child/i)).toBeInTheDocument();
  });

  test('should have a retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  test('should reset error state on retry', () => {
    let shouldThrow = true;

    const ConditionalThrow = () => {
      if (shouldThrow) throw new Error('Conditional error');
      return <div>Success after retry</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Simulate fix
    shouldThrow = false;

    // Click retry
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    retryButton.click();

    // Should show fixed component
    expect(screen.getByText('Success after retry')).toBeInTheDocument();
  });
});
