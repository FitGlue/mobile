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
    ]);
  } catch (e) {
    console.error('[StorageService] Failed to clear storage:', e);
  }
}

/**
 * Get default sync date (e.g., 30 days ago for initial sync)
 */
export function getDefaultSyncDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}
