# Testing

This document covers testing strategies for the FitGlue mobile app.

## Testing Challenges

Mobile health apps present unique testing challenges:

| Challenge | Approach |
|-----------|----------|
| Health SDK requires native builds | Mock services for unit tests |
| Platform-specific behavior | Test on real devices for health features |
| Background sync timing | Manual triggering + log inspection |
| Firebase Auth | Use test project credentials |

## Test Structure

```
mobile/
├── __tests__/               # Unit tests (planned)
│   ├── services/
│   │   ├── SyncService.test.ts
│   │   └── StorageService.test.ts
│   ├── context/
│   │   └── AuthContext.test.tsx
│   └── hooks/
│       └── useHealth.test.ts
└── e2e/                     # End-to-end tests (planned)
    └── auth.test.ts
```

## Unit Testing

### Testing Services

Mock platform-specific dependencies:

```typescript
// __tests__/services/SyncService.test.ts

jest.mock('../src/services/AppleHealthService', () => ({
  queryNewWorkouts: jest.fn(),
  isHealthKitAvailable: jest.fn(() => true),
}));

jest.mock('../src/services/StorageService', () => ({
  getLastSyncDate: jest.fn(() => Promise.resolve(new Date('2024-01-01'))),
  setLastSyncDate: jest.fn(() => Promise.resolve()),
  isSyncEnabled: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../src/config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(() => Promise.resolve('mock-token')),
    },
  },
}));

describe('SyncService', () => {
  it('should sync new workouts', async () => {
    const mockWorkouts = [
      {
        activityName: 'Running',
        startTime: '2024-01-15T08:00:00Z',
        duration: 1800,
        source: 'healthkit',
      },
    ];

    (AppleHealthService.queryNewWorkouts as jest.Mock).mockResolvedValue(mockWorkouts);

    const result = await performSync();

    expect(result.success).toBe(true);
    expect(result.processedCount).toBeGreaterThan(0);
  });
});
```

### Testing StorageService

```typescript
// __tests__/services/StorageService.test.ts

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StorageService from '../src/services/StorageService';

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLastSyncDate', () => {
    it('should return null if no date stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorageService.getLastSyncDate();

      expect(result).toBeNull();
    });

    it('should parse stored date correctly', async () => {
      const storedDate = '2024-01-15T10:30:00.000Z';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedDate);

      const result = await StorageService.getLastSyncDate();

      expect(result).toEqual(new Date(storedDate));
    });
  });
});
```

### Testing Context

```typescript
// __tests__/context/AuthContext.test.tsx

import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

jest.mock('../src/config/firebase', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  subscribeToAuthState: jest.fn((callback) => {
    callback(null); // Start signed out
    return () => {};
  }),
}));

describe('AuthContext', () => {
  it('should start with no user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle sign in', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    // Check that signIn was called
    expect(signIn).toHaveBeenCalledWith('test@example.com', 'password');
  });
});
```

## Mocking Health Services

For testing without actual health SDK:

```typescript
// __mocks__/react-native-health.ts

export default {
  initHealthKit: jest.fn((options, callback) => callback(null)),
  getSamples: jest.fn((options, callback) => {
    callback(null, [
      {
        id: '123',
        activityName: 'HKWorkoutActivityTypeRunning',
        start: '2024-01-15T08:00:00Z',
        end: '2024-01-15T08:30:00Z',
        duration: 1800,
        calories: 300,
        distance: 5000,
      },
    ]);
  }),
  getHeartRateSamples: jest.fn((options, callback) => {
    callback(null, [
      { startDate: '2024-01-15T08:05:00Z', value: 145 },
      { startDate: '2024-01-15T08:10:00Z', value: 152 },
    ]);
  }),
};
```

```typescript
// __mocks__/react-native-health-connect.ts

export const initialize = jest.fn(() => Promise.resolve(true));
export const getSdkStatus = jest.fn(() => Promise.resolve(3)); // Available
export const requestPermission = jest.fn(() => Promise.resolve([
  { recordType: 'ExerciseSession' },
  { recordType: 'HeartRate' },
]));
export const readRecords = jest.fn((recordType) => {
  if (recordType === 'ExerciseSession') {
    return Promise.resolve({
      records: [
        {
          metadata: { id: '456' },
          exerciseType: 40, // Running
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T08:30:00Z',
        },
      ],
    });
  }
  return Promise.resolve({ records: [] });
});
```

## Manual Testing

### Authentication Flow

1. **Fresh install test:**
   - Clear app data
   - Launch app
   - Verify LoginScreen appears
   - Sign in with valid credentials
   - Verify navigation to HomeScreen

2. **Persistent session test:**
   - Sign in
   - Close app completely
   - Reopen app
   - Verify HomeScreen appears (no login required)

3. **Error handling test:**
   - Enter invalid email format
   - Enter wrong password
   - Enter non-existent email
   - Verify appropriate error messages

### Health Integration

1. **iOS HealthKit:**
   - Build development build
   - Launch on simulator/device
   - Tap "Connect to Apple Health"
   - Grant permissions in Health app
   - Verify status shows "Granted"
   - Add test workout in Health app
   - Tap "Fetch Workouts"
   - Verify workout appears in list

2. **Android Health Connect:**
   - Install Health Connect on emulator
   - Build and install development build
   - Tap "Connect to Health Connect"
   - Grant permissions
   - Add test workout via Fitness app
   - Verify sync works

### Background Sync

Testing background sync is challenging. Strategies:

1. **Log inspection:**
   ```bash
   # iOS
   npx react-native log-ios | grep BackgroundSync

   # Android
   adb logcat | grep -i backgroundsync
   ```

2. **Force trigger (iOS Simulator):**
   - Xcode > Debug > Simulate Background Fetch

3. **Reduce interval for testing:**
   ```typescript
   // Temporarily in BackgroundSyncTask.ts
   const SYNC_INTERVAL_SECONDS = 60; // 1 minute for testing
   ```

## E2E Testing with Detox

### Setup (Planned)

```bash
npm install detox --save-dev
```

### Example Test

```typescript
// e2e/auth.test.ts

describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen', async () => {
    await expect(element(by.text('FitGlue'))).toBeVisible();
    await expect(element(by.text('Sign in to sync your workouts'))).toBeVisible();
  });

  it('should sign in with valid credentials', async () => {
    await element(by.placeholder('you@example.com')).typeText('test@fitglue.tech');
    await element(by.placeholder('••••••••')).typeText('testpassword');
    await element(by.text('Sign In')).tap();

    await waitFor(element(by.text('Welcome back,')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.placeholder('you@example.com')).typeText('wrong@email.com');
    await element(by.placeholder('••••••••')).typeText('wrongpassword');
    await element(by.text('Sign In')).tap();

    await waitFor(element(by.text('Invalid email or password.')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

## Test Environments

| Environment | Firebase Project | Use Case |
|-------------|-----------------|----------|
| development | fitglue-dev | Daily development |
| test | fitglue-test | CI/CD, automated tests |
| production | fitglue-prod | Never for testing |

## Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm test -- --coverage

# E2E tests (when configured)
npm run e2e:ios
npm run e2e:android
```

## Related Documentation

- [Local Development](./local-development.md)
- [Troubleshooting](./troubleshooting.md)
- [Health Integration](../features/health-integration.md)
