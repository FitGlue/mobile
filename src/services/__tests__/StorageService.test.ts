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

describe('clearAllStorage', () => {
    it('clears all keys', async () => {
        await setLastSyncDate(new Date());
        await setSyncEnabled(false);
        await addToQueue([{ id: '1' }]);

        await clearAllStorage();

        expect(await getLastSyncDate()).toBeNull();
        expect(await isSyncEnabled()).toBe(true); // defaults back to true
        expect(await getQueuedActivities()).toEqual([]);
    });
});
