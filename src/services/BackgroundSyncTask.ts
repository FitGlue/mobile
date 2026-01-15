/**
 * Background Sync Task
 *
 * Registers and manages background sync using expo-background-fetch and expo-task-manager.
 * Syncs health data when the app is in the background.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { performSync } from './SyncService';
import { isSyncEnabled } from './StorageService';

// Task name constant
export const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

// Minimum interval between syncs (in seconds)
// iOS has a minimum of 15 minutes, Android can be more frequent
const SYNC_INTERVAL_SECONDS = 15 * 60; // 15 minutes

/**
 * Define the background sync task
 * This is registered at app startup
 */
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
      console.log('[BackgroundSync] No new data');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.error('[BackgroundSync] Sync failed:', result.error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (error) {
    console.error('[BackgroundSync] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background sync task
 * Should be called when the user logs in and grants health permissions
 */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      return true;
    }

    // Register the background fetch task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: SYNC_INTERVAL_SECONDS,
      stopOnTerminate: false, // Continue running after app is closed
      startOnBoot: true, // Start when device boots (Android only)
    });

    console.log('[BackgroundSync] Task registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Failed to register task:', error);
    return false;
  }
}

/**
 * Unregister the background sync task
 * Should be called when the user logs out or disables sync
 */
export async function unregisterBackgroundSync(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (!isRegistered) {
      console.log('[BackgroundSync] Task not registered');
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

/**
 * Check if background sync is registered
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch (error) {
    console.error('[BackgroundSync] Failed to check registration:', error);
    return false;
  }
}

/**
 * Get the current background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<{
  status: BackgroundFetch.BackgroundFetchStatus;
  statusName: string;
  isAvailable: boolean;
}> {
  try {
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
  } catch (error) {
    console.error('[BackgroundSync] Failed to get status:', error);
    return {
      status: BackgroundFetch.BackgroundFetchStatus.Denied,
      statusName: 'Error',
      isAvailable: false,
    };
  }
}

/**
 * Manually trigger a sync (useful for testing or user-initiated sync)
 */
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
