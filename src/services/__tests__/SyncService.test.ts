/**
 * Tests for the sync orchestration layer. Platform, Constants, firebase auth,
 * the health services, StorageService and fetch are all mocked so we can drive
 * each branch of performSync / forceResync / submitActivities / etc.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: 17 } }));
import { Platform } from 'react-native';
const mockPlatform = Platform as unknown as { OS: 'ios' | 'android' | 'web'; Version: number };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '9.9.9' } },
}));

const mockGetIdToken = jest.fn();
const mockAuth: { currentUser: { getIdToken: jest.Mock } | null } = {
  currentUser: { getIdToken: mockGetIdToken },
};
jest.mock('../../config/firebase', () => ({
  get auth() {
    return mockAuth;
  },
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

jest.mock('../../config/environment', () => ({ apiConfig: { baseUrl: 'https://api.test' } }));
jest.mock('../../config/api', () => ({
  endpoints: { mobileSync: '/sync', activities: '/activities' },
}));

const mockAppleQuery = jest.fn();
const mockAndroidQuery = jest.fn();
jest.mock('../AppleHealthService', () => ({ queryNewWorkouts: (...a: unknown[]) => mockAppleQuery(...a) }));
jest.mock('../AndroidHealthService', () => ({ queryNewWorkouts: (...a: unknown[]) => mockAndroidQuery(...a) }));

jest.mock('../StorageService', () => ({
  __esModule: true,
  isSyncEnabled: jest.fn(),
  getLastSyncDate: jest.fn(),
  getDefaultSyncDate: jest.fn(),
  setLastSyncDate: jest.fn(),
  getQueuedActivities: jest.fn(),
  addToQueue: jest.fn(),
  clearQueue: jest.fn(),
}));
import * as StorageServiceModule from '../StorageService';
const mockStorage = StorageServiceModule as unknown as {
  isSyncEnabled: jest.Mock;
  getLastSyncDate: jest.Mock;
  getDefaultSyncDate: jest.Mock;
  setLastSyncDate: jest.Mock;
  getQueuedActivities: jest.Mock;
  addToQueue: jest.Mock;
  clearQueue: jest.Mock;
};

import {
  performSync,
  forceResync,
  getSyncStatus,
  submitActivities,
  fetchRemoteSyncedIds,
} from '../SyncService';

function fakeResponse(opts: { ok?: boolean; status?: number; json?: unknown; text?: string }) {
  const { ok = true, status = 200, json = {}, text = '' } = opts;
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(json),
    text: jest.fn().mockResolvedValue(text),
  };
}

let fetchMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
  mockPlatform.Version = 17;
  mockGetIdToken.mockResolvedValue('tok');
  mockAuth.currentUser = { getIdToken: mockGetIdToken };
  mockStorage.isSyncEnabled.mockResolvedValue(true);
  mockStorage.getLastSyncDate.mockResolvedValue(new Date('2026-01-01T00:00:00Z'));
  mockStorage.getDefaultSyncDate.mockReturnValue(new Date('2025-12-01T00:00:00Z'));
  mockStorage.setLastSyncDate.mockResolvedValue(undefined);
  mockStorage.getQueuedActivities.mockResolvedValue([]);
  mockStorage.addToQueue.mockResolvedValue(undefined);
  mockStorage.clearQueue.mockResolvedValue(undefined);
  mockAppleQuery.mockResolvedValue([]);
  mockAndroidQuery.mockResolvedValue([]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

describe('performSync', () => {
  it('returns early (success) when sync is disabled', async () => {
    mockStorage.isSyncEnabled.mockResolvedValue(false);

    const res = await performSync();

    expect(res).toEqual({ success: true, processedCount: 0, skippedCount: 0, error: 'Sync disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails when there is no authenticated user', async () => {
    mockAuth.currentUser = null;

    const res = await performSync();

    expect(res.success).toBe(false);
    expect(res.error).toBe('Not authenticated');
  });

  it('fails (no token) when getIdToken throws', async () => {
    mockGetIdToken.mockRejectedValue(new Error('expired'));

    const res = await performSync();

    expect(res.error).toBe('Not authenticated');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('uses the default sync date when none is stored', async () => {
    mockStorage.getLastSyncDate.mockResolvedValue(null);

    await performSync();

    expect(mockStorage.getDefaultSyncDate).toHaveBeenCalled();
    expect(mockAppleQuery).toHaveBeenCalledWith(new Date('2025-12-01T00:00:00Z'));
  });

  it('advances the sync date but does not POST when there are no new activities', async () => {
    mockAppleQuery.mockResolvedValue([]);

    const res = await performSync();

    expect(res).toMatchObject({ success: true, processedCount: 0, skippedCount: 0 });
    expect(res.syncedAt).toBeInstanceOf(Date);
    expect(mockStorage.setLastSyncDate).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits activities, prepends the retry queue, and clears it on success', async () => {
    mockAppleQuery.mockResolvedValue([{ externalId: 'a' }]);
    mockStorage.getQueuedActivities.mockResolvedValue([{ externalId: 'queued' }]);
    fetchMock.mockResolvedValue(
      fakeResponse({ json: { success: true, processedCount: 2, skippedCount: 0 } }),
    );

    const res = await performSync();

    expect(res.success).toBe(true);
    expect(res.processedCount).toBe(2);
    // queued activity prepended before the fresh one
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.activities[0].externalId).toBe('queued');
    expect(body.activities[1].externalId).toBe('a');
    expect(body.device.platform).toBe('ios');
    expect(mockStorage.clearQueue).toHaveBeenCalled();
    expect(mockStorage.setLastSyncDate).toHaveBeenCalled();
  });

  it('queries Android workouts when on android', async () => {
    mockPlatform.OS = 'android';
    mockAndroidQuery.mockResolvedValue([{ externalId: 'b' }]);
    fetchMock.mockResolvedValue(fakeResponse({ json: { success: true, processedCount: 1 } }));

    await performSync();

    expect(mockAndroidQuery).toHaveBeenCalled();
    expect(mockAppleQuery).not.toHaveBeenCalled();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).device.platform).toBe('android');
  });

  it('returns no activities on an unsupported platform', async () => {
    mockPlatform.OS = 'web';

    const res = await performSync();

    expect(res.processedCount).toBe(0);
    expect(mockAppleQuery).not.toHaveBeenCalled();
    expect(mockAndroidQuery).not.toHaveBeenCalled();
  });

  it('reports a server error and does not advance the sync date', async () => {
    mockAppleQuery.mockResolvedValue([{ externalId: 'a' }]);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 503, text: 'down' }));

    const res = await performSync();

    expect(res.success).toBe(false);
    expect(res.error).toBe('Server error: 503');
    expect(mockStorage.clearQueue).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('queues activities for retry on a network error', async () => {
    const activities = [{ externalId: 'a' }];
    mockAppleQuery.mockResolvedValue(activities);
    fetchMock.mockRejectedValue(new Error('offline'));

    const res = await performSync();

    expect(res.success).toBe(false);
    expect(res.error).toBe('offline');
    expect(mockStorage.addToQueue).toHaveBeenCalledWith(expect.arrayContaining(activities));
  });
});

describe('forceResync', () => {
  it('sets the sync date to the given date then runs a normal sync', async () => {
    const from = new Date('2025-06-01T00:00:00Z');

    await forceResync(from);

    expect(mockStorage.setLastSyncDate).toHaveBeenCalledWith(from);
    // getLastSyncDate is consulted by the subsequent performSync
    expect(mockStorage.getLastSyncDate).toHaveBeenCalled();
  });
});

describe('getSyncStatus', () => {
  it('aggregates storage + auth + platform state', async () => {
    mockStorage.getLastSyncDate.mockResolvedValue(new Date('2026-02-02T00:00:00Z'));
    mockStorage.isSyncEnabled.mockResolvedValue(true);

    const status = await getSyncStatus();

    expect(status).toEqual({
      lastSyncDate: new Date('2026-02-02T00:00:00Z'),
      syncEnabled: true,
      isAuthenticated: true,
      platform: 'ios',
    });
  });

  it('reports not authenticated when there is no user', async () => {
    mockAuth.currentUser = null;
    const status = await getSyncStatus();
    expect(status.isAuthenticated).toBe(false);
  });
});

describe('submitActivities', () => {
  const sample = [
    {
      id: 'w1',
      type: 'Run',
      startDate: new Date('2026-01-01T10:00:00Z'),
      endDate: new Date('2026-01-01T11:00:00Z'),
      duration: 3600,
      distance: 10000,
      calories: 600,
      source: 'healthkit' as const,
    },
  ];

  it('fails when not authenticated', async () => {
    mockAuth.currentUser = null;
    const res = await submitActivities(sample);
    expect(res.error).toBe('Not authenticated');
  });

  it('maps WorkoutData to the API shape and submits without touching the sync date', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: { success: true, processedCount: 1 } }));

    const res = await submitActivities(sample);

    expect(res.success).toBe(true);
    expect(res.syncedAt).toBeInstanceOf(Date);
    expect(mockStorage.setLastSyncDate).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.activities[0]).toMatchObject({
      externalId: 'w1',
      activityName: 'Run',
      startTime: '2026-01-01T10:00:00.000Z',
      duration: 3600,
      source: 'healthkit',
    });
  });

  it('leaves syncedAt undefined on failure', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 500, text: 'x' }));
    const res = await submitActivities(sample);
    expect(res.success).toBe(false);
    expect(res.syncedAt).toBeUndefined();
  });
});

describe('fetchRemoteSyncedIds', () => {
  it('returns [] when not authenticated', async () => {
    mockAuth.currentUser = null;
    expect(await fetchRemoteSyncedIds()).toEqual([]);
  });

  it('returns the activityIds array from the backend', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: { activityIds: ['x', 'y'] } }));
    expect(await fetchRemoteSyncedIds()).toEqual(['x', 'y']);
  });

  it('defaults to [] when the payload has no activityIds', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: {} }));
    expect(await fetchRemoteSyncedIds()).toEqual([]);
  });

  it('returns [] on a non-ok response', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));
    expect(await fetchRemoteSyncedIds()).toEqual([]);
  });

  it('returns [] on a network error', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    expect(await fetchRemoteSyncedIds()).toEqual([]);
  });
});
