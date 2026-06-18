/**
 * Tests for the global ErrorBoundary. Clipboard + Sentry are mocked. A child
 * that throws on demand drives the error state.
 */

const mockSetStringAsync = jest.fn();
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockSetStringAsync(...a) }));

const mockCaptureException = jest.fn();
jest.mock('@sentry/react-native', () => ({ captureException: (...a: unknown[]) => mockCaptureException(...a) }));

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) throw new Error('kaboom');
  return <Text>safe child</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe child')).toBeTruthy();
  });

  it('renders the recovery UI and reports to Sentry when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('kaboom')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('copies the error details to the clipboard', async () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.press(screen.getByText('Copy Error'));

    await waitFor(() => expect(mockSetStringAsync).toHaveBeenCalled());
    expect(mockSetStringAsync.mock.calls[0][0]).toContain('kaboom');
  });

  it('recovers (renders children again) after pressing Try Again', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Swap in a non-throwing child first, then retry — otherwise the boundary
    // immediately re-catches the still-throwing child and stays in error state.
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.press(screen.getByText('Try Again'));

    expect(screen.getByText('safe child')).toBeTruthy();
  });
});
