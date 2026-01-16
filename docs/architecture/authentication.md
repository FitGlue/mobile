# Authentication

FitGlue Mobile uses Firebase Authentication for user identity, with persistent sessions via AsyncStorage.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ LoginScreen  │───▶│  AuthContext │───▶│   Firebase   │   │
│  │              │    │              │    │     Auth     │   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘   │
│                             │                    │           │
│                             │ state              │ persist   │
│                             ▼                    ▼           │
│                      ┌──────────────┐    ┌──────────────┐   │
│                      │ AppNavigator │    │ AsyncStorage │   │
│                      │              │    │              │   │
│                      └──────────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Firebase Initialization

Firebase is configured in `src/config/firebase.ts`:

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './environment';

let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // Use React Native persistence with AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApps()[0];
  auth = getAuth(app);
}
```

### Key Points

- **Single initialization** — Checks `getApps().length` to prevent duplicate initialization
- **AsyncStorage persistence** — Sessions survive app restarts
- **React Native optimized** — Uses `initializeAuth` with RN-specific persistence

## AuthContext

The `AuthContext` manages authentication state app-wide:

### State Interface

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
```

### Auth State Subscription

On mount, AuthContext subscribes to Firebase auth changes:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToAuthState((firebaseUser) => {
    setUser(firebaseUser);
    setIsLoading(false);
  });

  return () => unsubscribe();
}, []);
```

This ensures:
- Persisted sessions are restored automatically
- State updates when session expires
- Clean cleanup on unmount

## Login Flow

```
User                     LoginScreen              AuthContext              Firebase
  │                          │                         │                       │
  │ Enter credentials        │                         │                       │
  │─────────────────────────▶│                         │                       │
  │                          │                         │                       │
  │                          │ signIn(email, password) │                       │
  │                          │─────────────────────────▶│                       │
  │                          │                         │                       │
  │                          │                         │ signInWithEmailAndPassword
  │                          │                         │──────────────────────▶│
  │                          │                         │                       │
  │                          │                         │◀─────── UserCredential │
  │                          │                         │                       │
  │                          │◀───────── true ─────────│                       │
  │                          │                         │                       │
  │                          │      onAuthStateChanged │                       │
  │                          │◀────────────────────────│                       │
  │                          │                         │                       │
  │           isAuthenticated = true                   │                       │
  │◀──── Navigate to Home ───│                         │                       │
  │                          │                         │                       │
```

### Sign In Implementation

```typescript
const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
  setIsLoading(true);
  setError(null);

  try {
    await firebaseSignIn(email, password);
    return true;
  } catch (err) {
    const errorMessage = getAuthErrorMessage(err);
    setError(errorMessage);
    return false;
  } finally {
    setIsLoading(false);
  }
}, []);
```

## Error Handling

Firebase auth errors are mapped to user-friendly messages:

```typescript
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
      default:
        return 'An error occurred. Please try again.';
    }
  }
  return 'An unexpected error occurred.';
}
```

## Token Management

Firebase ID tokens are used to authenticate API requests:

```typescript
// In firebase.ts
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('[Firebase] Failed to get ID token:', error);
    return null;
  }
}

// In SyncService.ts
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

// API call with token
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

### Token Lifecycle

- Tokens are automatically refreshed by Firebase SDK
- `getIdToken()` returns a fresh token (forces refresh if needed)
- Tokens are valid for 1 hour

## Using Auth in Components

### With useAuth Hook

```tsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return <Text>Not logged in</Text>;
  }

  return (
    <View>
      <Text>Welcome, {user?.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}
```

### Error Display

```tsx
function LoginForm() {
  const { error, clearError, signIn } = useAuth();

  return (
    <View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Form inputs */}

      <Button
        title="Sign In"
        onPress={() => {
          clearError();
          signIn(email, password);
        }}
      />
    </View>
  );
}
```

## Session Persistence

Sessions are persisted using AsyncStorage:

```typescript
auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

**User experience:**
- App remembers logged-in users across restarts
- No need to re-login after closing the app
- Session persists until explicit sign out or token expiry

## Sign Out

```typescript
const signOut = useCallback(async (): Promise<void> => {
  setIsLoading(true);
  setError(null);

  try {
    await firebaseSignOut();
  } catch (err) {
    const errorMessage = getAuthErrorMessage(err);
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
}, []);
```

Sign out:
1. Calls Firebase `signOut()`
2. Clears the persisted session from AsyncStorage
3. Triggers `onAuthStateChanged` with `null`
4. AppNavigator switches to LoginScreen

## Environment-Specific Firebase

Each environment uses a different Firebase project:

| Environment | Firebase Project | Auth Domain |
|------------|------------------|-------------|
| development | fitglue-dev | fitglue-dev.firebaseapp.com |
| test | fitglue-test | fitglue-test.firebaseapp.com |
| production | fitglue-prod | fitglue-prod.firebaseapp.com |

## Registration

User registration is **not available in the mobile app**. Users must register via the website:

```typescript
const handleRegisterLink = useCallback(() => {
  Linking.openURL('https://fitglue.tech/auth/register');
}, []);
```

This ensures:
- Consistent onboarding experience
- All users set up billing/preferences on web
- Mobile app is purely a companion for syncing

## Related Documentation

- [Navigation](./navigation.md)
- [Architecture Overview](./overview.md)
- [Sync Service](../features/sync-service.md)
