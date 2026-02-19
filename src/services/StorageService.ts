/**
 * Storage Service
 *
 * AsyncStorage wrapper for persisting sync state and user preferences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  LAST_SYNC_DATE: '@fitglue/last_sync_date',
  SYNC_ENABLED: '@fitglue/sync_enabled',
  USER_PREFERENCES: '@fitglue/user_preferences',
  PENDING_ACTIVITIES: '@fitglue/pending_activities',
  HEALTH_INITIALIZED: '@fitglue/health_initialized',
  HEALTH_PERMISSIONS: '@fitglue/health_permissions',
  HEALTH_CONNECTION_STATUS: '@fitglue/health_connection_status',
};

/**
 * Get the last successful sync date
 */
export async function getLastSyncDate(): Promise<Date | null> {
  try {
    const value = await AsyncStorage.getItem(KEYS.LAST_SYNC_DATE);
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  } catch (e) {
    console.error('[StorageService] Failed to get last sync date:', e);
    return null;
  }
}

/**
 * Set the last successful sync date
 */
export async function setLastSyncDate(date: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC_DATE, date.toISOString());
  } catch (e) {
    console.error('[StorageService] Failed to set last sync date:', e);
  }
}

/**
 * Check if sync is enabled
 */
export async function isSyncEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEYS.SYNC_ENABLED);
    return value !== 'false'; // Default to enabled
  } catch (e) {
    console.error('[StorageService] Failed to get sync enabled status:', e);
    return true;
  }
}

/**
 * Set sync enabled status
 */
export async function setSyncEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SYNC_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('[StorageService] Failed to set sync enabled status:', e);
  }
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  syncIntervalMinutes?: number;
  notificationsEnabled?: boolean;
  autoSyncOnWifi?: boolean;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const value = await AsyncStorage.getItem(KEYS.USER_PREFERENCES);
    if (value) {
      return JSON.parse(value);
    }
    return {};
  } catch (e) {
    console.error('[StorageService] Failed to get user preferences:', e);
    return {};
  }
}

/**
 * Set user preferences
 */
export async function setUserPreferences(preferences: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  } catch (e) {
    console.error('[StorageService] Failed to set user preferences:', e);
  }
}

/**
 * Clear all storage (for logout)
 */
export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.LAST_SYNC_DATE,
      KEYS.SYNC_ENABLED,
      KEYS.USER_PREFERENCES,
      KEYS.PENDING_ACTIVITIES,
      KEYS.HEALTH_INITIALIZED,
      KEYS.HEALTH_PERMISSIONS,
      KEYS.HEALTH_CONNECTION_STATUS,
    ]);
  } catch (e) {
    console.error('[StorageService] Failed to clear storage:', e);
  }
}

/**
 * Persisted health state shape
 */
export interface PersistedHealthState {
  isInitialized: boolean;
  permissions: { workouts: boolean; heartRate: boolean; routes: boolean };
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
}

const DEFAULT_HEALTH_STATE: PersistedHealthState = {
  isInitialized: false,
  permissions: { workouts: false, heartRate: false, routes: false },
  connectionStatus: 'idle',
};

/**
 * Get persisted health state (initialization, permissions, connection)
 */
export async function getHealthState(): Promise<PersistedHealthState> {
  try {
    const initializedVal = await AsyncStorage.getItem(KEYS.HEALTH_INITIALIZED);
    const permsVal = await AsyncStorage.getItem(KEYS.HEALTH_PERMISSIONS);
    const statusVal = await AsyncStorage.getItem(KEYS.HEALTH_CONNECTION_STATUS);

    const isInitialized = initializedVal === 'true';

    let permissions = DEFAULT_HEALTH_STATE.permissions;
    if (permsVal) {
      try {
        permissions = JSON.parse(permsVal);
      } catch {
        // corrupted — use defaults
      }
    }

    const connectionStatus =
      (statusVal as PersistedHealthState['connectionStatus']) || 'idle';

    return { isInitialized, permissions, connectionStatus };
  } catch (e) {
    console.error('[StorageService] Failed to get health state:', e);
    return DEFAULT_HEALTH_STATE;
  }
}

/**
 * Persist health state
 */
export async function setHealthState(state: PersistedHealthState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.HEALTH_INITIALIZED, state.isInitialized ? 'true' : 'false');
    await AsyncStorage.setItem(KEYS.HEALTH_PERMISSIONS, JSON.stringify(state.permissions));
    await AsyncStorage.setItem(KEYS.HEALTH_CONNECTION_STATUS, state.connectionStatus);
  } catch (e) {
    console.error('[StorageService] Failed to set health state:', e);
  }
}

/**
 * Get default sync date for initial sync.
 * Returns "now" so the first sync only captures activities going forward.
 * Historical activities can be backfilled individually via the UI.
 */
export function getDefaultSyncDate(): Date {
  return new Date();
}

/**
 * Get queued activities that failed to sync
 */
export async function getQueuedActivities(): Promise<any[]> {
  try {
    const value = await AsyncStorage.getItem(KEYS.PENDING_ACTIVITIES);
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (e) {
    console.error('[StorageService] Failed to get queued activities:', e);
    return [];
  }
}

/**
 * Add activities to the offline queue
 */
export async function addToQueue(activities: any[]): Promise<void> {
  try {
    const existing = await getQueuedActivities();
    const combined = [...existing, ...activities];
    await AsyncStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify(combined));
    console.log(`[StorageService] Queued ${activities.length} activities (total: ${combined.length})`);
  } catch (e) {
    console.error('[StorageService] Failed to queue activities:', e);
  }
}

/**
 * Clear the offline queue (after successful sync)
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_ACTIVITIES);
  } catch (e) {
    console.error('[StorageService] Failed to clear queue:', e);
  }
}
