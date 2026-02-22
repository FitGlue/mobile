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
    getSyncedIds,
    addSyncedId,
    getCachedWorkouts,
    setCachedWorkouts,
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
    it('clears all keys including health state and synced IDs', async () => {
        await setLastSyncDate(new Date());
        await setSyncEnabled(false);
        await addToQueue([{ id: '1' }]);
        await setHealthState({
            isInitialized: true,
            permissions: { workouts: true, heartRate: true, routes: false },
            connectionStatus: 'connected',
        });
        await addSyncedId('act-1');

        await clearAllStorage();

        expect(await getLastSyncDate()).toBeNull();
        expect(await isSyncEnabled()).toBe(true); // defaults back to true
        expect(await getQueuedActivities()).toEqual([]);
        const health = await getHealthState();
        expect(health.isInitialized).toBe(false);
        expect(health.connectionStatus).toBe('idle');
        const synced = await getSyncedIds();
        expect(synced.size).toBe(0);
        const cached = await getCachedWorkouts();
        expect(cached).toEqual([]);
    });
});

describe('syncedActivityIds', () => {
    it('returns empty set when nothing stored', async () => {
        const result = await getSyncedIds();
        expect(result).toEqual(new Set());
        expect(result.size).toBe(0);
    });

    it('adds and retrieves a synced ID', async () => {
        await addSyncedId('workout-1');
        const result = await getSyncedIds();
        expect(result.has('workout-1')).toBe(true);
        expect(result.size).toBe(1);
    });

    it('deduplicates IDs', async () => {
        await addSyncedId('workout-1');
        await addSyncedId('workout-1');
        const result = await getSyncedIds();
        expect(result.size).toBe(1);
    });

    it('stores multiple IDs', async () => {
        await addSyncedId('workout-1');
        await addSyncedId('workout-2');
        await addSyncedId('workout-3');
        const result = await getSyncedIds();
        expect(result.size).toBe(3);
        expect(result.has('workout-2')).toBe(true);
    });
});

describe('cachedWorkouts', () => {
    it('returns empty array when nothing stored', async () => {
        const result = await getCachedWorkouts();
        expect(result).toEqual([]);
    });

    it('round-trips workouts with date rehydration', async () => {
        const workouts = [
            {
                id: 'w-1',
                type: 'Running',
                startDate: new Date('2026-02-20T08:00:00.000Z'),
                endDate: new Date('2026-02-20T08:30:00.000Z'),
                duration: 1800,
                source: 'health_connect',
            },
            {
                id: 'w-2',
                type: 'Cycling',
                startDate: new Date('2026-02-19T17:00:00.000Z'),
                endDate: new Date('2026-02-19T18:00:00.000Z'),
                duration: 3600,
                distance: 25000,
                source: 'health_connect',
            },
        ];
        await setCachedWorkouts(workouts);
        const result = await getCachedWorkouts();
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('w-1');
        expect(result[0].type).toBe('Running');
        expect(result[0].startDate).toBeInstanceOf(Date);
        expect(result[0].startDate.toISOString()).toBe('2026-02-20T08:00:00.000Z');
        expect(result[1].distance).toBe(25000);
    });

    it('overwrites previous cache', async () => {
        await setCachedWorkouts([{ id: 'old', type: 'Walking', startDate: new Date(), endDate: new Date(), duration: 600 }]);
        await setCachedWorkouts([{ id: 'new', type: 'Running', startDate: new Date(), endDate: new Date(), duration: 1200 }]);
        const result = await getCachedWorkouts();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('new');
    });
});
