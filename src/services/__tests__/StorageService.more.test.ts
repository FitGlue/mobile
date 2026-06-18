/**
 * Supplementary StorageService tests covering user preferences, the default
 * sync date, and the AsyncStorage-failure (logger.error) branches not exercised
 * by StorageService.test.ts.
 */

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserPreferences,
  setUserPreferences,
  getDefaultSyncDate,
  getLastSyncDate,
  isSyncEnabled,
  getQueuedActivities,
  getSyncedIds,
  getCachedWorkouts,
  getHealthState,
  setHealthState,
  setLastSyncDate,
  setSyncEnabled,
  addToQueue,
  clearQueue,
  addSyncedId,
  setCachedWorkouts,
  clearAllStorage,
} from '../StorageService';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

describe('StorageService — preferences & defaults', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  describe('user preferences', () => {
    it('returns {} when nothing is stored', async () => {
      expect(await getUserPreferences()).toEqual({});
    });

    it('round-trips preferences', async () => {
      await setUserPreferences({ syncIntervalMinutes: 30, notificationsEnabled: true });
      expect(await getUserPreferences()).toEqual({ syncIntervalMinutes: 30, notificationsEnabled: true });
    });
  });

  describe('getDefaultSyncDate', () => {
    it('returns roughly now', () => {
      const before = Date.now();
      const d = getDefaultSyncDate();
      expect(d.getTime()).toBeGreaterThanOrEqual(before);
      expect(d.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe('getLastSyncDate edge cases', () => {
    it('returns null for a corrupt (non-date) stored value', async () => {
      await AsyncStorage.setItem('@fitglue/last_sync_date', 'not-a-date');
      expect(await getLastSyncDate()).toBeNull();
    });
  });

  describe('getHealthState corruption handling', () => {
    it('falls back to default permissions when the JSON is corrupt', async () => {
      await AsyncStorage.setItem('@fitglue/health_initialized', 'true');
      await AsyncStorage.setItem('@fitglue/health_permissions', '{bad json');
      const state = await getHealthState();
      expect(state.isInitialized).toBe(true);
      expect(state.permissions).toEqual({ workouts: false, heartRate: false, routes: false });
    });
  });
});

describe('StorageService — AsyncStorage failure branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('getLastSyncDate logs + returns null on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await getLastSyncDate()).toBeNull();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('setLastSyncDate logs on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('io'));
    await setLastSyncDate(new Date());
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('isSyncEnabled defaults to true on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await isSyncEnabled()).toBe(true);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('setSyncEnabled logs on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('io'));
    await setSyncEnabled(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getUserPreferences returns {} on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await getUserPreferences()).toEqual({});
  });

  it('setUserPreferences logs on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('io'));
    await setUserPreferences({});
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getQueuedActivities returns [] on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await getQueuedActivities()).toEqual([]);
  });

  it('addToQueue logs on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    await addToQueue([{ id: 1 }]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('clearQueue logs on error', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await clearQueue();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getSyncedIds returns an empty set on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await getSyncedIds()).toEqual(new Set());
  });

  it('addSyncedId logs on error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    await addSyncedId('x');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getCachedWorkouts returns [] on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    expect(await getCachedWorkouts()).toEqual([]);
  });

  it('setCachedWorkouts logs on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('io'));
    await setCachedWorkouts([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getHealthState returns defaults on read error', async () => {
    getItem.mockRejectedValueOnce(new Error('io'));
    const state = await getHealthState();
    expect(state.connectionStatus).toBe('idle');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('setHealthState logs on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('io'));
    await setHealthState({
      isInitialized: true,
      permissions: { workouts: true, heartRate: true, routes: true },
      connectionStatus: 'connected',
    });
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('clearAllStorage logs on error', async () => {
    (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await clearAllStorage();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
