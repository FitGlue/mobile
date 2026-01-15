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

/**
 * Convert Firebase auth errors to user-friendly messages
 */
function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;

    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/operation-not-allowed':
        return 'This operation is not allowed.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  return 'An unexpected error occurred.';
}

export { AuthContext };
