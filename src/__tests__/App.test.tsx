/**
 * Tests for the App root. Sentry, Constants and all heavy children are mocked
 * so importing App only exercises its own bootstrap logic.
 */

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({ name: 'nav' })),
  captureException: jest.fn(),
  wrap: (c: unknown) => c,
}));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));
jest.mock('../config/environment', () => ({ environment: 'test' }));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaProvider: View };
});
jest.mock('../context/AuthContext', () => ({ AuthProvider: ({ children }: { children: unknown }) => children }));
jest.mock('../navigation/AppNavigator', () => ({ AppNavigator: () => null }));
jest.mock('../components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: { children: unknown }) => children }));

import React from 'react';
import { render } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import App, { navigationIntegration } from '../../App';

const mockSentryInit = Sentry.init as jest.Mock;
const mockReactNavigationIntegration = Sentry.reactNavigationIntegration as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

describe('App bootstrap', () => {
  it('initialises Sentry with the resolved environment + release', () => {
    expect(mockSentryInit).toHaveBeenCalledTimes(1);
    const opts = mockSentryInit.mock.calls[0][0];
    expect(opts.environment).toBe('test');
    expect(opts.release).toBe('1.2.3');
    expect(opts.enabled).toBe(true); // not 'development'
  });

  it('exports the Sentry react-navigation integration', () => {
    expect(mockReactNavigationIntegration).toHaveBeenCalled();
    expect(navigationIntegration).toEqual({ name: 'nav' });
  });

  it('renders the provider tree without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('routes uncaught global errors to Sentry', () => {
    const handler = (global as { ErrorUtils?: { getGlobalHandler: () => (e: Error, f?: boolean) => void } })
      .ErrorUtils?.getGlobalHandler?.();
    if (handler) {
      // App's handler reports to Sentry then chains to the original RN handler,
      // which rethrows in the test env — swallow that, we only assert the report.
      try {
        handler(new Error('fatal boom'), true);
      } catch {
        /* original handler rethrow */
      }
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { fatal: 'true' } }),
      );
    }
  });
});
