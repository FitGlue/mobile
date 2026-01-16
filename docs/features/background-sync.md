# Background Sync

FitGlue uses Expo's background fetch API to sync health data even when the app is closed.

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Background Sync Flow                       │
│                                                               │
│  ┌─────────────────┐         ┌─────────────────────────┐     │
│  │     System      │         │   BackgroundSyncTask     │     │
│  │  (iOS/Android)  │────────▶│                          │     │
│  │                 │ trigger │  BACKGROUND_SYNC task    │     │
│  └─────────────────┘         └───────────┬─────────────┘     │
│                                          │                    │
│                                          │ calls              │
│                                          ▼                    │
│                              ┌─────────────────────┐          │
│                              │    SyncService      │          │
│                              │   performSync()     │          │
│                              └───────────┬─────────┘          │
│                                          │                    │
│                                          ▼                    │
│                              ┌─────────────────────┐          │
│                              │   Health Platform   │          │
│                              │   Query + Submit    │          │
│                              └─────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## Implementation

### Task Registration

Located in `src/services/BackgroundSyncTask.ts`:

```typescript
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

// Task name constant
export const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

// Minimum interval between syncs (in seconds)
const SYNC_INTERVAL_SECONDS = 15 * 60; // 15 minutes
```

### Task Definition

The task is defined at module load time (required by Expo):

```typescript
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('[BackgroundSync] Task triggered');

  try {
    // Check if sync is enabled
    const enabled = await isSyncEnabled();
    if (!enabled) {
      console.log('[BackgroundSync] Sync disabled, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Perform the sync
    const result = await performSync();

    if (result.success) {
      if (result.processedCount > 0) {
        console.log(`[BackgroundSync] Synced ${result.processedCount} activities`);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.error('[BackgroundSync] Sync failed:', result.error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (error) {
    console.error('[BackgroundSync] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
```

### Registering the Task

Call after user logs in and grants health permissions:

```typescript
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      return true;
    }

    // Register the background fetch task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: SYNC_INTERVAL_SECONDS,
      stopOnTerminate: false,    // Continue after app close
      startOnBoot: true,         // Start on device boot (Android)
    });

    console.log('[BackgroundSync] Task registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Failed to register task:', error);
    return false;
  }
}
```

### Unregistering the Task

Call on logout or when user disables sync:

```typescript
export async function unregisterBackgroundSync(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      return true;
    }

    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSync] Task unregistered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Failed to unregister task:', error);
    return false;
  }
}
```

## Configuration Options

```typescript
BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
  minimumInterval: 15 * 60,  // 15 minutes minimum
  stopOnTerminate: false,    // Keep running after app closes
  startOnBoot: true,         // Start on device boot (Android only)
});
```

| Option | Description | Default |
|--------|-------------|---------|
| `minimumInterval` | Minimum time between executions (seconds) | Required |
| `stopOnTerminate` | Stop when app is terminated | `true` |
| `startOnBoot` | Start task when device boots (Android) | `false` |

## Platform Differences

### iOS

- **Minimum interval**: 15 minutes (system enforced)
- **Execution timing**: System decides optimal times based on:
  - User activity patterns
  - Battery state
  - Network availability
- **Power mode**: Background refresh disabled in Low Power Mode
- **User control**: Can be disabled in Settings > General > Background App Refresh

**iOS Considerations:**
- The system aggressively limits background execution
- Apps with poor background fetch performance get deprioritized
- Must return result quickly (< 30 seconds)

### Android

- **Minimum interval**: More flexible than iOS
- **Execution timing**: Based on WorkManager scheduling
- **Doze mode**: Limited execution when device is idle
- **Battery optimization**: May need to be disabled for reliable execution
- **Manufacturer differences**: Some OEMs (Xiaomi, Huawei, Samsung) are very aggressive with battery optimization

**Android Considerations:**
- Ask users to disable battery optimization
- Test on real devices from different manufacturers
- `startOnBoot: true` ensures task runs after restart

## Background Fetch Status

Check if background fetch is available:

```typescript
export async function getBackgroundFetchStatus(): Promise<{
  status: BackgroundFetch.BackgroundFetchStatus;
  statusName: string;
  isAvailable: boolean;
}> {
  const status = await BackgroundFetch.getStatusAsync();

  const statusNames: Record<BackgroundFetch.BackgroundFetchStatus, string> = {
    [BackgroundFetch.BackgroundFetchStatus.Restricted]: 'Restricted',
    [BackgroundFetch.BackgroundFetchStatus.Denied]: 'Denied',
    [BackgroundFetch.BackgroundFetchStatus.Available]: 'Available',
  };

  return {
    status,
    statusName: statusNames[status] || 'Unknown',
    isAvailable: status === BackgroundFetch.BackgroundFetchStatus.Available,
  };
}
```

| Status | Meaning | Action |
|--------|---------|--------|
| `Available` | Background fetch enabled | Ready to use |
| `Denied` | User disabled background refresh | Prompt to enable |
| `Restricted` | System restriction (parental controls) | Cannot enable |

## Manual Trigger

For user-initiated sync or testing:

```typescript
export async function triggerManualSync(): Promise<{
  success: boolean;
  processedCount: number;
  error?: string;
}> {
  console.log('[BackgroundSync] Manual sync triggered');

  const result = await performSync();

  return {
    success: result.success,
    processedCount: result.processedCount,
    error: result.error,
  };
}
```

## Task Results

The background task must return a result:

```typescript
BackgroundFetch.BackgroundFetchResult.NewData    // Synced new activities
BackgroundFetch.BackgroundFetchResult.NoData     // No new activities
BackgroundFetch.BackgroundFetchResult.Failed     // Sync failed
```

These results inform the OS about task success:
- **NewData**: System may increase execution frequency
- **NoData**: Normal, task ran but nothing to sync
- **Failed**: System may reduce execution frequency

## Lifecycle Integration

### On Login

```typescript
async function onUserLogin() {
  // Initialize health
  await initializeHealth();

  // Request permissions
  await requestHealthPermissions();

  // Register background sync
  await registerBackgroundSync();
}
```

### On Logout

```typescript
async function onUserLogout() {
  // Unregister background sync
  await unregisterBackgroundSync();

  // Clear storage
  await clearAllStorage();

  // Sign out
  await signOut();
}
```

### On Disable Sync

```typescript
async function onDisableSync() {
  await setSyncEnabled(false);
  await unregisterBackgroundSync();
}
```

## Debugging

### iOS Simulator

Force a background fetch:
1. Run app in Xcode
2. Pause the app
3. Debug menu > Simulate Background Fetch

### Android

Check task registration:
```bash
adb shell dumpsys jobscheduler | grep fitglue
```

### Logs

```bash
# iOS
npx react-native log-ios | grep BackgroundSync

# Android
adb logcat | grep -i backgroundsync
```

## Battery Considerations

Background sync impacts battery life. Best practices:

1. **Respect minimumInterval**: Don't try to sync more frequently
2. **Skip unnecessary syncs**: Check for new data before API calls
3. **Handle failures gracefully**: Don't retry aggressively
4. **Clean up**: Unregister when user logs out

## Related Documentation

- [Sync Service](./sync-service.md)
- [Health Integration](./health-integration.md)
- [Troubleshooting](../development/troubleshooting.md)
