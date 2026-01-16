# Health Integration

Deep dive into iOS HealthKit and Android Health Connect integration.

## Overview

FitGlue mobile syncs workout data from device health platforms to the FitGlue backend. Each platform has its own SDK, permissions model, and data structures.

```
┌─────────────────────────────────────────────────────────────┐
│                     Device Health Platforms                  │
│                                                              │
│  ┌────────────────────┐    ┌─────────────────────────┐      │
│  │   iOS HealthKit    │    │  Android Health Connect  │      │
│  │                    │    │                          │      │
│  │  react-native-     │    │  react-native-health-    │      │
│  │  health            │    │  connect                 │      │
│  └─────────┬──────────┘    └───────────┬─────────────┘      │
│            │                           │                     │
│            └─────────────┬─────────────┘                     │
│                          │                                   │
│                          ▼                                   │
│           ┌────────────────────────────┐                     │
│           │    Unified useHealth Hook   │                     │
│           │    StandardizedActivity    │                     │
│           └────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## iOS HealthKit

### Requirements

- iOS 13.0+
- Device with Health app (all iPhones)
- Development build (not Expo Go)

### Configuration

#### app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.fitglue.mobile",
      "infoPlist": {
        "NSHealthShareUsageDescription": "FitGlue needs access to read your health data including workouts, heart rate, and GPS routes to sync with your connected services.",
        "NSHealthUpdateUsageDescription": "FitGlue needs access to write workout data to Apple Health."
      },
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": []
      }
    }
  }
}
```

#### Key Configuration Points

| Config | Purpose |
|--------|---------|
| `NSHealthShareUsageDescription` | Shown when requesting read permissions |
| `NSHealthUpdateUsageDescription` | Shown when requesting write permissions |
| `com.apple.developer.healthkit` | Enables HealthKit capability |
| `com.apple.developer.healthkit.access` | Additional clinical data types (empty for workout data) |

### Data Types

FitGlue requests access to these HealthKit data types:

```typescript
const permissions = {
  permissions: {
    read: [
      'Workout',                    // Workout sessions
      'HeartRate',                  // Heart rate samples
      'DistanceWalkingRunning',     // Distance for runs/walks
      'DistanceCycling',            // Distance for cycling
      'ActiveEnergyBurned',         // Calories burned
    ],
  },
};
```

### AppleHealthService Implementation

Located in `src/services/AppleHealthService.ts`:

#### Initialization

```typescript
export async function initializeHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!AppleHealthKit) {
      resolve(false);
      return;
    }

    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) {
        console.error('[AppleHealthService] Failed to initialize:', err);
        resolve(false);
        return;
      }
      console.log('[AppleHealthService] HealthKit initialized successfully');
      resolve(true);
    });
  });
}
```

#### Querying Workouts

```typescript
export async function queryNewWorkouts(
  lastSyncDate: Date
): Promise<StandardizedActivity[]> {
  return new Promise(async (resolve, reject) => {
    const options = {
      startDate: lastSyncDate.toISOString(),
      endDate: new Date().toISOString(),
      type: 'Workout',
    };

    AppleHealthKit.getSamples(options, async (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      const activities: StandardizedActivity[] = [];

      for (const workout of results) {
        // Get heart rate samples for this workout window
        const heartRateSamples = await getHeartRateSamples(
          new Date(workout.start),
          new Date(workout.end)
        );

        activities.push({
          externalId: workout.id,
          activityName: mapActivityType(workout.activityName),
          startTime: workout.start,
          endTime: workout.end,
          duration: workout.duration,
          calories: workout.calories,
          distance: workout.distance,
          heartRateSamples,
          source: 'healthkit',
        });
      }

      resolve(activities);
    });
  });
}
```

#### Activity Type Mapping

```typescript
const WORKOUT_ACTIVITY_TYPES: Record<string, string> = {
  'HKWorkoutActivityTypeRunning': 'Running',
  'HKWorkoutActivityTypeWalking': 'Walking',
  'HKWorkoutActivityTypeCycling': 'Cycling',
  'HKWorkoutActivityTypeSwimming': 'Swimming',
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeElliptical': 'Elliptical',
  'HKWorkoutActivityTypeRowing': 'Rowing',
  'HKWorkoutActivityTypeYoga': 'Yoga',
  'HKWorkoutActivityTypeHiking': 'Hiking',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'HIIT',
  // ... more mappings
};
```

---

## Android Health Connect

### Requirements

- Android API 26+ (Android 8.0)
- Health Connect app installed
  - API 34+: Pre-installed
  - API 26-33: Install from Play Store
- Development build

### Configuration

#### app.json

```json
{
  "expo": {
    "android": {
      "package": "com.fitglue.mobile",
      "permissions": [
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_EXERCISE_ROUTE"
      ]
    },
    "plugins": [
      "expo-health-connect",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34,
            "targetSdkVersion": 34,
            "minSdkVersion": 26
          }
        }
      ]
    ]
  }
}
```

#### Key Configuration Points

| Config | Purpose |
|--------|---------|
| `health.READ_EXERCISE` | Read ExerciseSession records |
| `health.READ_HEART_RATE` | Read HeartRate records |
| `health.READ_EXERCISE_ROUTE` | Read GPS routes (requires additional privacy handling) |
| `minSdkVersion: 26` | Minimum for Health Connect |
| `compileSdkVersion: 34` | Required for Health Connect APIs |

### Data Types

Health Connect uses record types:

```typescript
const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  // ExerciseRoute requires additional setup
];
```

### AndroidHealthService Implementation

Located in `src/services/AndroidHealthService.ts`:

#### Availability Check

```typescript
export async function checkAvailability(): Promise<{
  isAvailable: boolean;
  status: string;
}> {
  const status = await HealthConnect.getSdkStatus();

  // SDK Status values:
  // 1 = SDK_UNAVAILABLE
  // 2 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
  // 3 = SDK_AVAILABLE

  if (status === 3) {
    return { isAvailable: true, status: 'Available' };
  } else if (status === 2) {
    return { isAvailable: false, status: 'Health Connect app needs update' };
  }
  return { isAvailable: false, status: 'Health Connect not installed' };
}
```

#### Permission Handling

Android 14+ has a new permissions model:

```typescript
export async function checkAndRequestPermissions(): Promise<{
  granted: boolean;
  permissions: { recordType: string; granted: boolean }[];
}> {
  // First check current permissions
  const currentPermissions = await HealthConnect.getGrantedPermissions();

  const hasExercise = currentPermissions.some(
    (p) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
  );
  const hasHeartRate = currentPermissions.some(
    (p) => p.recordType === 'HeartRate' && p.accessType === 'read'
  );

  if (hasExercise && hasHeartRate) {
    return { granted: true, permissions: [...] };
  }

  // Request permissions
  const result = await HealthConnect.requestPermission(REQUIRED_PERMISSIONS);

  return {
    granted: result.some((p) => p.recordType === 'ExerciseSession'),
    permissions: [...],
  };
}
```

#### Querying Workouts

```typescript
export async function queryNewWorkouts(
  lastSyncDate: Date
): Promise<StandardizedActivity[]> {
  const result = await HealthConnect.readRecords('ExerciseSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: lastSyncDate.toISOString(),
      endTime: new Date().toISOString(),
    },
  });

  const activities: StandardizedActivity[] = [];

  for (const session of result.records) {
    // Get heart rate samples for this session
    const heartRateSamples = await getHeartRateRecords(
      new Date(session.startTime),
      new Date(session.endTime)
    );

    activities.push({
      externalId: session.metadata?.id,
      activityName: mapExerciseType(session.exerciseType),
      startTime: session.startTime,
      endTime: session.endTime,
      duration: (new Date(session.endTime) - new Date(session.startTime)) / 1000,
      heartRateSamples,
      source: 'health_connect',
    });
  }

  return activities;
}
```

#### Exercise Type Mapping

Health Connect uses numeric exercise types:

```typescript
const EXERCISE_TYPE_MAP: Record<number, string> = {
  0: 'Unknown',
  4: 'Biking',
  11: 'Elliptical',
  21: 'HIIT',
  22: 'Hiking',
  37: 'Rowing',
  40: 'Running',
  41: 'RunningTreadmill',
  55: 'StrengthTraining',
  58: 'Swimming',
  64: 'Walking',
  66: 'Weightlifting',
  68: 'Yoga',
  // ... more mappings (0-68+)
};
```

---

## Unified Data Model

Both services produce `StandardizedActivity` for consistent backend submission:

```typescript
interface StandardizedActivity {
  externalId?: string;           // Platform-specific ID
  activityName: string;          // Normalized activity type
  startTime: string;             // ISO 8601
  endTime: string;               // ISO 8601
  duration: number;              // Seconds
  calories?: number;
  distance?: number;             // Meters
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

---

## useHealth Hook

The `useHealth` hook in `src/hooks/useHealth.ts` provides a unified interface:

```typescript
interface UseHealthResult {
  isAvailable: boolean;         // Platform SDK available
  isInitialized: boolean;       // SDK initialized
  permissions: HealthPermissionStatus;
  error: string | null;
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<HealthPermissionStatus>;
  getWorkouts: (startDate: Date, endDate: Date) => Promise<WorkoutData[]>;
}
```

### Usage

```tsx
function HealthComponent() {
  const {
    isAvailable,
    isInitialized,
    permissions,
    initialize,
    requestPermissions,
    getWorkouts,
  } = useHealth();

  const handleConnect = async () => {
    const success = await initialize();
    if (success) {
      await requestPermissions();
    }
  };

  const handleSync = async () => {
    const workouts = await getWorkouts(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date()
    );
    console.log(`Found ${workouts.length} workouts`);
  };

  return (
    <View>
      <Text>Available: {isAvailable ? 'Yes' : 'No'}</Text>
      <Text>Initialized: {isInitialized ? 'Yes' : 'No'}</Text>
      <Button title="Connect" onPress={handleConnect} />
      <Button title="Sync" onPress={handleSync} />
    </View>
  );
}
```

---

## Platform Differences

| Feature | iOS HealthKit | Android Health Connect |
|---------|---------------|----------------------|
| **SDK** | react-native-health | react-native-health-connect |
| **Min Version** | iOS 13+ | Android 8.0+ (API 26) |
| **App Required** | Health (built-in) | Health Connect (may need install) |
| **Permission UI** | Full list on init | Record-by-record |
| **Background Read** | Yes (with Background Fetch) | Yes (with foreground service) |
| **Route Data** | HKWorkoutRoute (complex) | ExerciseRoute record |

---

## GPS/Route Data

### Current Status

GPS route extraction is **partially implemented**:

- **iOS**: Workout routes require `HKWorkoutRouteQuery` with streaming, which is complex in React Native. Current implementation returns empty routes.
- **Android**: ExerciseRoute record type is available but requires explicit permission and additional privacy handling.

### Future Enhancement

Full GPS support would require:
1. Enhanced native module for HKWorkoutRouteQuery
2. ExerciseRoute permission and extraction for Android
3. Route simplification for payload size

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Background Sync](./background-sync.md)
- [Sync Service](./sync-service.md)
- [Local Development](../development/local-development.md)
