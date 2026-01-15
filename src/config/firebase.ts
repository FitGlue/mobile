/**
 * FitGlue Mobile Firebase Configuration
 *
 * Initializes Firebase for authentication.
 * Uses environment-aware configuration.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, isDebug } from './environment';

// Initialize Firebase app if not already initialized
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // Use React Native persistence with AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  if (isDebug) {
    console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
}

export { app, auth };

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  if (isDebug) {
    console.log('[Firebase] Attempting sign in for:', email);
  }
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  if (isDebug) {
    console.log('[Firebase] Signing out');
  }
  return firebaseSignOut(auth);
}

/**
 * Get the current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user's ID token for API calls
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('[Firebase] Failed to get ID token:', error);
    return null;
  }
}

// Re-export types for convenience
export type { User, UserCredential };
