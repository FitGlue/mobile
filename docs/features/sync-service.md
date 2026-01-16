# Sync Service

The SyncService is the core orchestration layer that coordinates health data fetching and backend submission.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       SyncService                            │
│                                                              │
│  1. Check sync enabled (StorageService)                      │
│  2. Get auth token (Firebase)                                │
│  3. Get last sync date (StorageService)                      │
│  4. Query platform health data                               │
│  5. Submit to backend API                                    │
│  6. Update last sync date on success                         │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

Located in `src/services/SyncService.ts`.

### SyncResult Type

```typescript
interface SyncResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  error?: string;
  syncedAt?: Date;
}
```

### performSync

```typescript
export async function performSync(): Promise<SyncResult> {
  // 1. Check if sync is enabled
  const syncEnabled = await StorageService.isSyncEnabled();
  if (!syncEnabled) {
    return { success: true, processedCount: 0, skippedCount: 0, error: 'Sync disabled' };
  }

  // 2. Get auth token
  const token = await getAuthToken();
  if (!token) {
    return { success: false, processedCount: 0, skippedCount: 0, error: 'Not authenticated' };
  }

  // 3. Get last sync date (default to 30 days ago)
  let lastSyncDate = await StorageService.getLastSyncDate();
  if (!lastSyncDate) {
    lastSyncDate = StorageService.getDefaultSyncDate();
  }

  // 4. Query platform health data
  const { activities, platform } = await queryPlatformWorkouts(lastSyncDate);

  if (activities.length === 0) {
    await StorageService.setLastSyncDate(new Date());
    return { success: true, processedCount: 0, skippedCount: 0, syncedAt: new Date() };
  }

  // 5. Submit to backend
  const result = await submitToBackend(activities, platform, token);

  // 6. Update sync date on success
  if (result.success) {
    const syncedAt = new Date();
    await StorageService.setLastSyncDate(syncedAt);
    return { ...result, syncedAt };
  }

  return result;
}
```

## API Payload

The sync payload sent to `/api/mobile/sync`:

```json
{
  "activities": [
    {
      "externalId": "healthkit-123",
      "activityName": "Running",
      "startTime": "2024-01-15T08:00:00.000Z",
      "endTime": "2024-01-15T08:30:00.000Z",
      "duration": 1800,
      "calories": 300,
      "distance": 5000,
      "heartRateSamples": [
        { "timestamp": "2024-01-15T08:05:00.000Z", "bpm": 145 }
      ],
      "source": "healthkit"
    }
  ],
  "device": {
    "platform": "ios",
    "osVersion": "17.2",
    "appVersion": "1.0.0"
  },
  "sync": {
    "batchId": "sync-1705312800000"
  }
}
```

## Additional Functions

### forceResync

```typescript
export async function forceResync(fromDate: Date): Promise<SyncResult> {
  await StorageService.setLastSyncDate(fromDate);
  return performSync();
}
```

### getSyncStatus

```typescript
export async function getSyncStatus(): Promise<{
  lastSyncDate: Date | null;
  syncEnabled: boolean;
  isAuthenticated: boolean;
  platform: string;
}> {
  return {
    lastSyncDate: await StorageService.getLastSyncDate(),
    syncEnabled: await StorageService.isSyncEnabled(),
    isAuthenticated: auth.currentUser !== null,
    platform: Platform.OS,
  };
}
```

## Error Handling

| Error | Cause | Behavior |
|-------|-------|----------|
| Not authenticated | No user/token | Returns immediately |
| Network error | Offline/timeout | Returns with error, preserves sync date |
| Server error | 4xx/5xx response | Returns with error, preserves sync date |

## Related Documentation

- [Background Sync](./background-sync.md)
- [Health Integration](./health-integration.md)
- [Architecture Overview](../architecture/overview.md)
