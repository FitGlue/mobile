# Navigation Structure

The FitGlue mobile app uses React Navigation with an auth-aware stack navigator pattern.

## Navigation Stack

```
AppNavigator (Stack.Navigator)
├── [Unauthenticated] LoginScreen
└── [Authenticated] HomeScreen
```

## Implementation

The navigator is defined in `src/navigation/AppNavigator.tsx`:

```typescript
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Auth-Aware Routing

The navigator automatically switches between stacks based on authentication state:

```
┌───────────────────────────────────────────────────────┐
│                     AppNavigator                       │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │              isLoading = true                   │   │
│  │                                                 │   │
│  │            ┌─────────────────┐                  │   │
│  │            │  LoadingScreen  │                  │   │
│  │            │  (ActivityInd.) │                  │   │
│  │            └─────────────────┘                  │   │
│  └────────────────────────────────────────────────┘   │
│                         │                              │
│                         ▼                              │
│  ┌────────────────────────────────────────────────┐   │
│  │            isAuthenticated?                     │   │
│  │                                                 │   │
│  │     false                        true           │   │
│  │       │                            │            │   │
│  │       ▼                            ▼            │   │
│  │  ┌──────────┐              ┌──────────┐        │   │
│  │  │  Login   │              │   Home   │        │   │
│  │  │  Screen  │              │  Screen  │        │   │
│  │  └──────────┘              └──────────┘        │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

## Screen Hierarchy

### LoginScreen

Entry point for unauthenticated users.

**Purpose:** Allow users to sign in with existing FitGlue credentials

**Features:**
- Email/password input with validation
- Show/hide password toggle
- Error display for auth failures
- Links to register and forgot password (opens in browser)
- Environment badge for dev/test builds

**External Links:**
- Register: `https://fitglue.app/register`
- Forgot Password: `https://fitglue.app/forgot-password`

### HomeScreen

Main dashboard for authenticated users.

**Purpose:** Display sync status and manage health integration

**Features:**
- User greeting with email
- Health platform status card (Available, Initialized, Permissions)
- Sync status card with last sync time
- Recent workouts list (last 10)
- Connect to Health button (if not initialized)
- Fetch Workouts button (manual sync)
- Sign out functionality
- Pull-to-refresh

## Loading States

### Initial Auth Check

While Firebase checks for a persisted session:

```typescript
function LoadingScreen(): JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#14b8a6" />
    </View>
  );
}
```

This prevents a flash of the login screen for returning users.

## Screen Options

Default options applied to all screens:

```typescript
screenOptions={{
  headerShown: false,          // Hide default header
  contentStyle: {
    backgroundColor: '#0f172a' // Dark slate background
  },
  animation: 'fade',           // Fade transition
}}
```

## Provider Hierarchy

Screens are wrapped in the following provider order (from `App.tsx`):

```tsx
<GestureHandlerRootView>
  <SafeAreaProvider>
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

This ensures:
1. **GestureHandlerRootView** — Required for gesture-based navigation
2. **SafeAreaProvider** — Safe area context for notches/dynamic islands
3. **AuthProvider** — Authentication state available throughout app

## Type Safety

Navigation is fully typed using `RootStackParamList`:

```typescript
// Type-safe navigation would use:
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
```

Currently, the app has a simple two-screen structure without inter-screen navigation. As screens are added, typed hooks like `useNavigation<HomeScreenNavigationProp>()` should be used.

## Future Expansion

Planned screens for future versions:

```
RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Settings: undefined;              // User preferences
  ActivityDetail: { id: string };   // Workout details
  Pipelines: undefined;             // Pipeline management
}
```

## Related Documentation

- [Authentication](./authentication.md)
- [Architecture Overview](./overview.md)
