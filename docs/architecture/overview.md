# Architecture Overview

The FitGlue mobile app is an Expo/React Native application that synchronizes health data from device platforms (iOS HealthKit, Android Health Connect) to the FitGlue backend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FitGlue Mobile App                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐   │
│  │  Screens    │────│  Context     │────│  Navigation   │   │
│  │             │    │  (Auth)      │    │               │   │
│  └──────┬──────┘    └──────────────┘    └───────────────┘   │
│         │                                                    │
│         │ uses                                               │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Services Layer                     │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │    │
│  │  │  SyncService│  │BackgroundSync│  │StorageService│   │    │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘   │    │
│  │         │                │                            │    │
│  │         └────────┬───────┘                            │    │
│  │                  │                                    │    │
│  │         ┌────────┴────────┐                           │    │
│  │         ▼                 ▼                           │    │
│  │  ┌─────────────┐  ┌─────────────────┐                │    │
│  │  │AppleHealth  │  │AndroidHealth    │                │    │
│  │  │Service      │  │Service          │                │    │
│  │  └──────┬──────┘  └────────┬────────┘                │    │
│  └─────────┼──────────────────┼─────────────────────────┘    │
│            │                  │                              │
└────────────┼──────────────────┼──────────────────────────────┘
             │                  │
             ▼                  ▼
┌────────────────────┐  ┌────────────────────┐
│   iOS HealthKit    │  │  Android Health    │
│                    │  │     Connect        │
└────────────────────┘  └────────────────────┘
             │                  │
             └────────┬─────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   FitGlue Backend API  │
         │   /api/mobile/sync     │
         └────────────────────────┘
```

## Service Layer

The app follows a layered architecture with clear separation of concerns:

### AppleHealthService

iOS-specific service using `react-native-health` to query HealthKit:

```typescript
// Key functions from AppleHealthService.ts
export async function queryNewWorkouts(lastSyncDate: Date): Promise<StandardizedActivity[]>
export async function initializeHealthKit(): Promise<boolean>
export function isHealthKitAvailable(): boolean
```

**Capabilities:**
- Query workout sessions
- Fetch heart rate samples within workout windows
- Map HealthKit activity types to standardized names
- Convert to sync-ready payload format

### AndroidHealthService

Android-specific service using `react-native-health-connect`:

```typescript
// Key functions from AndroidHealthService.ts
export async function queryNewWorkouts(lastSyncDate: Date): Promise<StandardizedActivity[]>
export async function initializeHealthConnect(): Promise<boolean>
export async function checkAndRequestPermissions(): Promise<{granted, permissions}>
```

**Capabilities:**
- Query ExerciseSession records
- Fetch HeartRate records for session windows
- Handle Android 14+ permission model
- Check Health Connect SDK availability

### SyncService

Platform-agnostic orchestration layer that coordinates all sync operations:

```typescript
// Key functions from SyncService.ts
export async function performSync(): Promise<SyncResult>
export async function forceResync(fromDate: Date): Promise<SyncResult>
export async function getSyncStatus(): Promise<SyncStatus>
```

**Sync Flow:**
1. Check if sync is enabled (StorageService)
2. Get auth token (Firebase)
3. Get last sync date (StorageService)
4. Query platform health data (Apple/Android service)
5. Submit to backend API
6. Update last sync date on success

### BackgroundSyncTask

Manages background sync registration using Expo's background fetch:

```typescript
// Key exports from BackgroundSyncTask.ts
export const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';
export async function registerBackgroundSync(): Promise<boolean>
export async function unregisterBackgroundSync(): Promise<boolean>
export async function triggerManualSync(): Promise<SyncResult>
```

**Configuration:**
- Minimum interval: 15 minutes (iOS minimum)
- `stopOnTerminate: false` — continues after app close
- `startOnBoot: true` — starts on device boot (Android)

### StorageService

AsyncStorage wrapper for local persistence:

```typescript
// Key functions from StorageService.ts
export async function getLastSyncDate(): Promise<Date | null>
export async function setLastSyncDate(date: Date): Promise<void>
export async function isSyncEnabled(): Promise<boolean>
export async function getUserPreferences(): Promise<UserPreferences>
```

**Storage Keys:**
- `@fitglue/last_sync_date` — ISO date of last successful sync
- `@fitglue/sync_enabled` — boolean toggle
- `@fitglue/user_preferences` — JSON user settings

## Context Providers

### AuthContext

App-wide authentication state using Firebase Auth:

```typescript
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
```

Features:
- Persistent sessions via AsyncStorage
- Automatic auth state subscription
- User-friendly error message mapping

## Data Flow: Health to Server

```
1. User opens app / Background task triggers
            │
            ▼
2. SyncService.performSync()
            │
            ├─── Check sync enabled (StorageService)
            ├─── Get auth token (Firebase)
            ├─── Get last sync date (StorageService)
            │
            ▼
3. Platform Health Query
            │
   ┌────────┴────────┐
   │                 │
   ▼                 ▼
iOS HealthKit   Android Health Connect
   │                 │
   ▼                 ▼
AppleHealthService  AndroidHealthService
   │                 │
   └────────┬────────┘
            │
            ▼
4. StandardizedActivity[]
   {
     activityName: "Running",
     startTime: "2024-01-15T08:00:00Z",
     duration: 1800,
     heartRateSamples: [...],
     source: "healthkit" | "health_connect"
   }
            │
            ▼
5. POST /api/mobile/sync
   {
     activities: [...],
     device: { platform, osVersion, appVersion },
     sync: { batchId }
   }
            │
            ▼
6. Update last sync date on success
```

## Standardized Activity Payload

Both health services produce a unified `StandardizedActivity` format:

```typescript
interface StandardizedActivity {
  externalId?: string;
  activityName: string;
  startTime: string;    // ISO 8601
  endTime: string;      // ISO 8601
  duration: number;     // seconds
  calories?: number;
  distance?: number;    // meters
  heartRateSamples: HeartRateSample[];
  route?: RoutePoint[];
  source: 'healthkit' | 'health_connect';
}

interface HeartRateSample {
  timestamp: Date;
  bpm: number;
}

interface RoutePoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude?: number;
}
```

## Configuration Architecture

Environment-aware configuration in `src/config/environment.ts`:

```typescript
type Environment = 'development' | 'test' | 'production';

interface EnvironmentConfig {
  environment: Environment;
  firebase: FirebaseConfig;
  api: ApiConfig;
  debug: boolean;
}
```

Environment is determined by:
1. `Constants.expirationDate?.extra?.environment` (from app.json)
2. `process.env.EXPO_PUBLIC_ENVIRONMENT`
3. Defaults to `'development'`

## Related Documentation

- [Navigation Structure](./navigation.md)
- [Authentication](./authentication.md)
- [Health Integration](../features/health-integration.md)
- [Sync Service](../features/sync-service.md)
