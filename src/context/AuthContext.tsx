/**
 * FitGlue Mobile Authentication Context
 *
 * Provides app-wide authentication state management using Firebase Auth.
 * Handles persistent login via Firebase's AsyncStorage persistence.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  auth,
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  subscribeToAuthState,
  User,
} from '../config/firebase';
import { isDebug } from '../config/environment';
import * as Sentry from '@sentry/react-native';
import { logger } from '../utils/logger';
import { getAuthErrorMessage } from '../utils/authErrors';
import { requestPermissionsAndRegister, clearCachedToken } from '../services/NotificationService';
import { get, endpoints } from '../config/api';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  customToken: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customToken, setCustomToken] = useState<string | null>(null);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    if (isDebug) {
      console.log('[AuthContext] Subscribing to auth state changes');
    }

    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (isDebug) {
        console.log('[AuthContext] Auth state changed:', firebaseUser?.email ?? 'signed out');
      }
      setUser(firebaseUser);
      setIsLoading(false);

      // Update Sentry user context
      if (firebaseUser) {
        Sentry.setUser({ email: firebaseUser.email ?? undefined, id: firebaseUser.uid });
        // Register push notification token now that the user is authenticated
        requestPermissionsAndRegister();
        // Fetch a Firebase custom token so the WebView can sign in without a second login
        get<{ customToken: string }>(endpoints.webAuthToken)
          .then(res => { if (res.data?.customToken) setCustomToken(res.data.customToken); })
          .catch(() => {}); // non-fatal: web app will show its own login if token is missing
      } else {
        Sentry.setUser(null);
        setCustomToken(null);
      }
    });

    return () => {
      if (isDebug) {
        console.log('[AuthContext] Unsubscribing from auth state changes');
      }
      unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await firebaseSignIn(email, password);
      if (isDebug) {
        console.log('[AuthContext] Sign in successful');
      }
      return true;
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      if (isDebug) {
        console.error('[AuthContext] Sign in failed:', errorMessage);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await firebaseSignOut();
      // Clear cached token so the next login re-registers with the backend
      await clearCachedToken();
      if (isDebug) {
        console.log('[AuthContext] Sign out successful');
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      logger.error('[AuthContext] Sign out failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    customToken,
    signIn,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export { AuthContext };
