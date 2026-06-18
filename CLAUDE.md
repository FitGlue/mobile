# FitGlue Mobile

React Native/Expo app for iOS and Android. Syncs workout data from Apple HealthKit (iOS) and Android Health Connect to the FitGlue backend API.

## Stack

| Concern | Technology |
|---------|-----------|
| Framework | Expo 54 + React Native 0.81 |
| Language | TypeScript 5.9 (strict) |
| Auth | Firebase Auth 11.6 (AsyncStorage persistence) |
| Health (iOS) | @kingstinct/react-native-healthkit 9.0 |
| Health (Android) | react-native-health-connect 3.5 |
| Navigation | React Navigation 7 (native stack) |
| State | React Context + AsyncStorage (no Redux) |
| Background sync | expo-background-fetch + expo-task-manager |
| Error tracking | Sentry 7 |
| Build | EAS (Expo Application Services) |
| Node version | **20+** |

## Key Commands

```bash
npm run start:dev       # Dev server (development Firebase, tunnel mode)
npm run start:test      # Dev server (test Firebase)
npm run start:prod      # Dev server (production Firebase)
npm run ios             # iOS simulator
npm run android         # Android emulator

npm run build:dev       # EAS dev build (development client + simulator support)
npm run build:preview   # EAS preview build (internal testing, test env)
npm run build:prod      # EAS production build (App Store / Play Store)
npm test                # Jest unit tests
```

## Directory Structure

```
mobile/
├── App.tsx                      # Root: Sentry init + AuthContext + ErrorBoundary + Navigation
├── app.json                     # Expo config (permissions, plugins, bundle IDs)
├── eas.json                     # Build profiles (development, preview, production)
│
└── src/
    ├── config/
    │   ├── environment.ts       # Multi-env config (dev/test/prod Firebase & API URLs)
    │   ├── firebase.ts          # Firebase init + auth wrappers
    │   └── api.ts               # HTTP client (auto-injects Firebase bearer token)
    │
    ├── context/
    │   └── AuthContext.tsx      # Global auth state (user, isLoading, signIn, signOut)
    │
    ├── hooks/
    │   └── useHealth.ts         # Cross-platform health hook (iOS/Android abstraction)
    │
    ├── navigation/
    │   └── AppNavigator.tsx     # Auth-aware stack (Onboarding → Login → Home)
    │
    ├── screens/
    │   ├── OnboardingScreen.tsx # First-launch swipeable carousel
    │   ├── LoginScreen.tsx      # Email/password sign in (no in-app registration)
    │   ├── HomeScreen.tsx       # Main dashboard (workouts, sync status, health connection)
    │   ├── SettingsScreen.tsx   # Sync toggles, account, background sync status
    │   └── WorkoutDetailScreen.tsx  # Single workout: HR chart + GPS route
    │
    ├── services/
    │   ├── AppleHealthService.ts    # iOS HealthKit: workouts, HR samples, GPS routes
    │   ├── AndroidHealthService.ts  # Android Health Connect: workouts, HR, routes, calories
    │   ├── SyncService.ts           # Sync orchestration (platform-agnostic)
    │   ├── BackgroundSyncTask.ts    # Expo background fetch registration
    │   └── StorageService.ts        # AsyncStorage wrapper (sync dates, prefs, cache)
    │
    ├── components/              # UI components
    ├── types/
    │   └── health.ts            # WorkoutData, HeartRateSample, RoutePoint
    ├── utils/
    │   ├── formatters.ts        # Date/time formatting
    │   └── authErrors.ts        # Firebase error code → user-friendly messages
    └── theme.ts                 # Design tokens (colors, spacing, typography)
```

## Navigation

Auth-aware stack navigator in `AppNavigator.tsx`:

1. App init → check Firebase auth state + `@fitglue/onboarding_complete` in AsyncStorage
2. Never seen onboarding → **Onboarding** carousel
3. Not authenticated → **Login** screen
4. Authenticated → **Home** (with Settings and WorkoutDetail accessible)

```
Onboarding  →  Login  →  Home  →  WorkoutDetail
                                └→  Settings
```

## State Management

No Redux. Two patterns:

1. **AuthContext** — Global auth state (user, isLoading, signIn, signOut). Provider in App.tsx. Firebase handles session persistence via AsyncStorage.
2. **Local `useState` + AsyncStorage** — HomeScreen manages workouts, sync status, cached workouts. StorageService persists across restarts.

## Health Sync Architecture

### Sync Flow

```
User action / Background task
  → SyncService.performSync()
    → get Firebase token
    → get lastSyncDate (StorageService)
    → query health platform (AppleHealthService or AndroidHealthService)
    → POST /api/v2/users/me/mobile/sync
      → on success: update lastSyncDate, clear retry queue
      → on failure: queue activities (StorageService.addToQueue)
```

### Platform Differences

**iOS (HealthKit):**
- Workouts, HR samples, GPS routes (HKWorkoutRouteQuery)
- All permissions granted in a single system dialog

**Android (Health Connect, API 26+):**
- Workouts, HR, calories, distance, routes
- Routes may require two-phase consent: type 0 = DATA included, type 2 = must call `requestExerciseRoute(id)`
- Call `initialize()` before any queries (especially in background tasks)

### Background Sync

- Registered via `BackgroundSyncTask.registerBackgroundSync()` after health permissions granted
- iOS: ~15 min minimum interval (OS enforced)
- Android: Configurable, `startOnBoot: true`
- Unregistered on logout or when user disables sync

## API Client

`src/config/api.ts` — Simple fetch wrapper that automatically injects Firebase ID token:

```
POST /api/v2/users/me/mobile/sync        — submit workout batch
GET  /api/v2/users/me/mobile/activities  — fetch remote synced IDs
POST /api/v2/users/me/integrations/{provider}/connect — register health platform
GET  /api/v2/users/me                    — user profile
```

Base URL is environment-aware (dev/test/prod). No OpenAPI client — plain typed fetch.

## Authentication

- Email/password only (users register via web at fitglue.tech/auth/register)
- No in-app registration or password reset (links redirect to web)
- Sessions persist automatically via Firebase AsyncStorage integration
- `onAuthStateChanged()` in AuthContext restores session on app launch

## Build Profiles (eas.json)

| Profile | Env | Dist | Use Case |
|---------|-----|------|----------|
| development | development | internal | Native module iteration, dev client |
| preview | test | internal | Internal QA testing via QR code |
| production | production | store | App Store + Google Play submission |

**OTA Updates** (JS-only changes, no store review needed):
```bash
eas update --branch production --message "description"
```

**Full rebuild required** when changing: native modules, permissions, Expo SDK version, app.json plugins, or any native config.

## Environment Config

Set at build time via `EXPO_PUBLIC_ENVIRONMENT=development|test|production`.

| Env | Firebase Project | API Base URL |
|-----|-----------------|--------------|
| development | fitglue-server-dev | https://dev.fitglue.tech |
| test | fitglue-server-test | https://test.fitglue.tech |
| production | fitglue-server-prod | https://fitglue.tech |

## Theme (theme.ts)

- Primary: `#FF006E` (pink), Secondary: `#8338EC` (purple)
- Dark UI only (`userInterfaceStyle: "dark"` in app.json)
- Use `theme.colors`, `theme.spacing`, `theme.borderRadius`, `theme.typography` — no hardcoded values

## Testing

```bash
npm test            # Jest (jest-expo preset)
npm run test:coverage  # Jest with coverage
npm run typecheck   # tsc --noEmit
npm run preflight   # typecheck + coverage + per-file coverage floor
```

- **Preset:** `jest-expo` (babel-jest + jsdom), with `@testing-library/react-native` for component/hook render tests. Requires `babel-preset-expo` (in `babel.config.js`).
- **Coverage gates (enforced by `preflight`):** global lines/statements/functions ≥ 75%, branches ≥ 70% (`jest.coverageThreshold` in `package.json`), plus `scripts/check-file-coverage.js` which fails if any source file has zero coverage.
- Tests live in `__tests__/` dirs alongside the code they cover. AsyncStorage is mocked via `jest.setup.js`.
- **Mock hoisting gotchas (babel-jest, unlike the old ts-jest):** `jest.mock()` factories may only reference `mock`-prefixed variables, and the factory runs at *require* time — for eagerly-resolved imports (`import * as X`, `import { Named }`) build the mock object **inline inside the factory** with `jest.fn()`s and grab a handle by importing the mocked module, rather than referencing a top-level `const`.

## AsyncStorage Keys

| Key | Value |
|-----|-------|
| `@fitglue/last_sync_date` | ISO date string |
| `@fitglue/sync_enabled` | boolean |
| `@fitglue/onboarding_complete` | boolean |
| `@fitglue/pending_activities` | JSON array (retry queue) |
| `@fitglue/synced_activity_ids` | JSON array |
| `@fitglue/cached_workouts` | JSON array |
| `@fitglue/health_connection_status` | `idle\|connecting\|connected\|error` |
| `@fitglue/health_permissions` | JSON `{workouts, heartRate, routes}` |

## Release Process

1. Bump `expo.version` in `app.json`
2. `npm run build:prod` (EAS builds for both platforms)
3. `eas submit --platform all`
4. `git tag mobile/v{version} && git push --tags`
