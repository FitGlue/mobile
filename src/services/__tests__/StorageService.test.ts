/**
 * Tests for StorageService.
 *
 * Uses the AsyncStorage mock provided by @react-native-async-storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getLastSyncDate,
    setLastSyncDate,
    isSyncEnabled,
    setSyncEnabled,
    clearAllStorage,
    getQueuedActivities,
    addToQueue,
    clearQueue,
    getHealthState,
    setHealthState,
} from '../StorageService';

// AsyncStorage is automatically mocked by jest-expo
beforeEach(async () => {
    await AsyncStorage.clear();
});

describe('lastSyncDate', () => {
    it('returns null when no date is stored', async () => {
        const result = await getLastSyncDate();
        expect(result).toBeNull();
    });

    it('round-trips a date correctly', async () => {
        const date = new Date('2026-01-15T10:30:00.000Z');
        await setLastSyncDate(date);
        const result = await getLastSyncDate();
        expect(result).toEqual(date);
    });

    it('returns null for invalid date strings', async () => {
        await AsyncStorage.setItem('@fitglue/last_sync_date', 'not-a-date');
        const result = await getLastSyncDate();
        expect(result).toBeNull();
    });
});

describe('syncEnabled', () => {
    it('defaults to true when not set', async () => {
        const result = await isSyncEnabled();
        expect(result).toBe(true);
    });

    it('returns false after disabling', async () => {
        await setSyncEnabled(false);
        const result = await isSyncEnabled();
        expect(result).toBe(false);
    });

    it('returns true after re-enabling', async () => {
        await setSyncEnabled(false);
        await setSyncEnabled(true);
        const result = await isSyncEnabled();
        expect(result).toBe(true);
    });
});

describe('activity queue', () => {
    it('returns empty array when no activities queued', async () => {
        const result = await getQueuedActivities();
        expect(result).toEqual([]);
    });

    it('adds and retrieves activities', async () => {
        const activities = [{ id: '1', type: 'run' }, { id: '2', type: 'walk' }];
        await addToQueue(activities);
        const result = await getQueuedActivities();
        expect(result).toEqual(activities);
    });

    it('appends to existing queue', async () => {
        await addToQueue([{ id: '1' }]);
        await addToQueue([{ id: '2' }]);
        const result = await getQueuedActivities();
        expect(result).toHaveLength(2);
    });

    it('clears the queue', async () => {
        await addToQueue([{ id: '1' }]);
        await clearQueue();
        const result = await getQueuedActivities();
        expect(result).toEqual([]);
    });
});

describe('healthState', () => {
    it('returns defaults when nothing stored', async () => {
        const result = await getHealthState();
        expect(result).toEqual({
            isInitialized: false,
            permissions: { workouts: false, heartRate: false, routes: false },
            connectionStatus: 'idle',
        });
    });

    it('round-trips health state correctly', async () => {
        const state = {
            isInitialized: true,
            permissions: { workouts: true, heartRate: true, routes: false },
            connectionStatus: 'connected' as const,
        };
        await setHealthState(state);
        const result = await getHealthState();
        expect(result).toEqual(state);
    });

    it('handles partial permissions', async () => {
        const state = {
            isInitialized: true,
            permissions: { workouts: true, heartRate: false, routes: false },
            connectionStatus: 'error' as const,
        };
        await setHealthState(state);
        const result = await getHealthState();
        expect(result.permissions.workouts).toBe(true);
        expect(result.permissions.heartRate).toBe(false);
        expect(result.connectionStatus).toBe('error');
    });
});

describe('clearAllStorage', () => {
    it('clears all keys including health state', async () => {
        await setLastSyncDate(new Date());
        await setSyncEnabled(false);
        await addToQueue([{ id: '1' }]);
        await setHealthState({
            isInitialized: true,
            permissions: { workouts: true, heartRate: true, routes: false },
            connectionStatus: 'connected',
        });

        await clearAllStorage();

        expect(await getLastSyncDate()).toBeNull();
        expect(await isSyncEnabled()).toBe(true); // defaults back to true
        expect(await getQueuedActivities()).toEqual([]);
        const health = await getHealthState();
        expect(health.isInitialized).toBe(false);
        expect(health.connectionStatus).toBe('idle');
    });
});
