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
import { getAuthErrorMessage } from '../utils/authErrors';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
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
      } else {
        Sentry.setUser(null);
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
      if (isDebug) {
        console.log('[AuthContext] Sign out successful');
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      if (isDebug) {
        console.error('[AuthContext] Sign out failed:', errorMessage);
      }
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
