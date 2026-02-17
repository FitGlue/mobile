/**
 * Sync Service
 *
 * Core sync logic that coordinates health data fetching and backend submission.
 * Platform-agnostic orchestration layer.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth } from '../config/firebase';
import { apiConfig } from '../config/environment';
import * as AppleHealthService from './AppleHealthService';
import * as AndroidHealthService from './AndroidHealthService';
import * as StorageService from './StorageService';

/**
 * Sync result returned from performSync
 */
export interface SyncResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  error?: string;
  syncedAt?: Date;
}

/**
 * Get the current user's Firebase ID token
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[SyncService] No authenticated user');
    return null;
  }

  try {
    return await user.getIdToken();
  } catch (e) {
    console.error('[SyncService] Failed to get auth token:', e);
    return null;
  }
}

/**
 * Query workouts from the appropriate platform health service
 */
async function queryPlatformWorkouts(
  lastSyncDate: Date
): Promise<{
  activities: any[];
  platform: 'ios' | 'android';
}> {
  if (Platform.OS === 'ios') {
    const activities = await AppleHealthService.queryNewWorkouts(lastSyncDate);
    return { activities, platform: 'ios' };
  } else if (Platform.OS === 'android') {
    const activities = await AndroidHealthService.queryNewWorkouts(lastSyncDate);
    return { activities, platform: 'android' };
  }

  return { activities: [], platform: 'ios' };
}

/**
 * Submit activities to the FitGlue backend
 */
async function submitToBackend(
  activities: any[],
  platform: 'ios' | 'android',
  token: string
): Promise<{
  success: boolean;
  processedCount: number;
  skippedCount: number;
  error?: string;
}> {
  const url = `${apiConfig.baseUrl}/api/mobile/sync`;

  const payload = {
    activities,
    device: {
      platform,
      osVersion: Platform.Version?.toString(),
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    },
    sync: {
      batchId: `sync-${Date.now()}`,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SyncService] Backend error:', response.status, errorText);
      return {
        success: false,
        processedCount: 0,
        skippedCount: 0,
        error: `Server error: ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: result.success ?? true,
      processedCount: result.processedCount ?? 0,
      skippedCount: result.skippedCount ?? 0,
      error: result.error,
    };
  } catch (e) {
    console.error('[SyncService] Network error:', e);

    // Queue activities for retry on next sync
    console.log(`[SyncService] Queuing ${activities.length} activities for retry`);
    await StorageService.addToQueue(activities);

    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

/**
 * Perform a full sync cycle
 *
 * 1. Get last sync date from storage
 * 2. Query platform health service for new workouts
 * 3. Submit to backend
 * 4. Update last sync date on success
 */
export async function performSync(): Promise<SyncResult> {
  console.log('[SyncService] Starting sync...');

  // Check if sync is enabled
  const syncEnabled = await StorageService.isSyncEnabled();
  if (!syncEnabled) {
    console.log('[SyncService] Sync is disabled');
    return {
      success: true,
      processedCount: 0,
      skippedCount: 0,
      error: 'Sync disabled',
    };
  }

  // Check for authenticated user
  const token = await getAuthToken();
  if (!token) {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      error: 'Not authenticated',
    };
  }

  // Get last sync date (default to 30 days ago)
  let lastSyncDate = await StorageService.getLastSyncDate();
  if (!lastSyncDate) {
    lastSyncDate = StorageService.getDefaultSyncDate();
    console.log('[SyncService] No previous sync, using default date:', lastSyncDate.toISOString());
  } else {
    console.log('[SyncService] Last sync date:', lastSyncDate.toISOString());
  }

  // Query platform health data
  const { activities, platform } = await queryPlatformWorkouts(lastSyncDate);

  if (activities.length === 0) {
    console.log('[SyncService] No new activities to sync');
    // Update sync date even if no activities (to prevent re-querying)
    await StorageService.setLastSyncDate(new Date());
    return {
      success: true,
      processedCount: 0,
      skippedCount: 0,
      syncedAt: new Date(),
    };
  }

  console.log(`[SyncService] Found ${activities.length} new activities to sync`);

  // Prepend any queued activities from previous failed syncs
  const queuedActivities = await StorageService.getQueuedActivities();
  if (queuedActivities.length > 0) {
    console.log(`[SyncService] Adding ${queuedActivities.length} queued activities from previous failures`);
    activities.unshift(...queuedActivities);
  }

  console.log(`[SyncService] Submitting ${activities.length} total activities`);

  // Submit to backend
  const result = await submitToBackend(activities, platform, token);

  if (result.success) {
    const syncedAt = new Date();
    await StorageService.setLastSyncDate(syncedAt);
    // Clear the offline queue on successful sync
    await StorageService.clearQueue();
    console.log('[SyncService] Sync completed successfully');
    return {
      ...result,
      syncedAt,
    };
  }

  console.error('[SyncService] Sync failed:', result.error);
  return result;
}

/**
 * Force a full resync from a specific date
 */
export async function forceResync(fromDate: Date): Promise<SyncResult> {
  console.log('[SyncService] Forcing resync from:', fromDate.toISOString());

  // Temporarily set the sync date to the specified date
  await StorageService.setLastSyncDate(fromDate);

  // Perform sync
  return performSync();
}

/**
 * Get sync status information
 */
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

/**
 * Submit specific activities to FitGlue (for manual backfill).
 * Unlike performSync(), this does NOT update the sync date — it only
 * sends the provided activities.
 */
export async function submitActivities(
  activities: Array<{
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    distance?: number;
    calories?: number;
    source: 'healthkit' | 'health_connect';
  }>
): Promise<SyncResult> {
  console.log(`[SyncService] Submitting ${activities.length} activities for backfill`);

  const token = await getAuthToken();
  if (!token) {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      error: 'Not authenticated',
    };
  }

  // Convert WorkoutData format to the API format expected by submitToBackend
  const apiActivities = activities.map((a) => ({
    externalId: a.id,
    activityName: a.type,
    startTime: a.startDate.toISOString(),
    endTime: a.endDate.toISOString(),
    duration: a.duration,
    distance: a.distance,
    calories: a.calories,
    source: a.source,
  }));

  const platform = Platform.OS === 'ios' ? 'ios' as const : 'android' as const;
  const result = await submitToBackend(apiActivities, platform, token);

  return {
    ...result,
    syncedAt: result.success ? new Date() : undefined,
  };
}
