/**
 * Tests for AuthProvider / useAuth. Firebase, Sentry, the notification service
 * and the API client are mocked. The auth-state-change callback registered via
 * subscribeToAuthState is captured from the mock so we can simulate sign-in /
 * sign-out events.
 */

jest.mock('../../config/firebase', () => ({
  auth: {},
  signIn: jest.fn(),
  signOut: jest.fn(),
  subscribeToAuthState: jest.fn(),
}));
jest.mock('../../config/environment', () => ({ isDebug: false }));
jest.mock('@sentry/react-native', () => ({ setUser: jest.fn() }));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));
jest.mock('../../utils/authErrors', () => ({ getAuthErrorMessage: () => 'friendly error' }));
jest.mock('../../services/NotificationService', () => ({
  requestPermissionsAndRegister: jest.fn(),
  clearCachedToken: jest.fn(),
}));
jest.mock('../../config/api', () => ({
  get: jest.fn(),
  endpoints: { webAuthToken: '/web-auth-token' },
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { signIn as fbSignIn, signOut as fbSignOut, subscribeToAuthState } from '../../config/firebase';
import { requestPermissionsAndRegister, clearCachedToken } from '../../services/NotificationService';
import { get } from '../../config/api';
import { AuthProvider, useAuth } from '../AuthContext';

const mockFbSignIn = fbSignIn as jest.Mock;
const mockFbSignOut = fbSignOut as jest.Mock;
const mockSubscribe = subscribeToAuthState as jest.Mock;
const mockSetUser = Sentry.setUser as jest.Mock;
const mockRequestPerms = requestPermissionsAndRegister as jest.Mock;
const mockClearCachedToken = clearCachedToken as jest.Mock;
const mockGet = get as jest.Mock;
const mockUnsubscribe = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

/** The auth-state callback passed into subscribeToAuthState on mount. */
function authCallback(): (user: unknown) => void {
  return mockSubscribe.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribe.mockReturnValue(mockUnsubscribe);
  mockGet.mockResolvedValue({ data: { customToken: 'ct-123' } });
  mockRequestPerms.mockResolvedValue(undefined);
  mockClearCachedToken.mockResolvedValue(undefined);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/must be used within an AuthProvider/);
  });
});

describe('AuthProvider', () => {
  it('starts loading and subscribes to auth state on mount', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('populates user + Sentry + custom token on sign-in event', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authCallback()({ uid: 'u1', email: 'a@b.com' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockSetUser).toHaveBeenCalledWith({ email: 'a@b.com', id: 'u1' });
    expect(mockRequestPerms).toHaveBeenCalled();
    await waitFor(() => expect(result.current.customTokenReady).toBe(true));
    expect(result.current.customToken).toBe('ct-123');
  });

  it('still marks the custom token ready when the web-auth fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('no token'));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authCallback()({ uid: 'u2', email: 'c@d.com' });
    });

    await waitFor(() => expect(result.current.customTokenReady).toBe(true));
    expect(result.current.customToken).toBeNull();
  });

  it('clears user + Sentry + token on sign-out event', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // First sign in, then sign out
    await act(async () => {
      authCallback()({ uid: 'u1', email: 'a@b.com' });
    });
    await act(async () => {
      authCallback()(null);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockSetUser).toHaveBeenLastCalledWith(null);
    expect(result.current.customToken).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  describe('signIn', () => {
    it('returns true on success', async () => {
      mockFbSignIn.mockResolvedValue({ user: { uid: 'u1' } });
      const { result } = renderHook(() => useAuth(), { wrapper });

      let ok!: boolean;
      await act(async () => {
        ok = await result.current.signIn('a@b.com', 'pw');
      });

      expect(ok).toBe(true);
      expect(mockFbSignIn).toHaveBeenCalledWith('a@b.com', 'pw');
      expect(result.current.error).toBeNull();
    });

    it('returns false and sets a friendly error on failure', async () => {
      mockFbSignIn.mockRejectedValue(new Error('auth/wrong-password'));
      const { result } = renderHook(() => useAuth(), { wrapper });

      let ok!: boolean;
      await act(async () => {
        ok = await result.current.signIn('a@b.com', 'pw');
      });

      expect(ok).toBe(false);
      expect(result.current.error).toBe('friendly error');
    });
  });

  describe('signOut', () => {
    it('signs out and clears the cached push token', async () => {
      mockFbSignOut.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockFbSignOut).toHaveBeenCalled();
      expect(mockClearCachedToken).toHaveBeenCalled();
    });

    it('sets an error and logs when sign-out fails', async () => {
      mockFbSignOut.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBe('friendly error');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('resets the error to null', async () => {
      mockFbSignIn.mockRejectedValue(new Error('x'));
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('a@b.com', 'pw');
      });
      expect(result.current.error).toBe('friendly error');

      act(() => result.current.clearError());
      expect(result.current.error).toBeNull();
    });
  });
});
