/**
 * Tests for the background-sync task wiring. TaskManager / BackgroundFetch are
 * mocked; the task callback registered via defineTask is captured so it can be
 * invoked directly.
 */

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
}));

jest.mock('../SyncService', () => ({ performSync: jest.fn() }));
jest.mock('../StorageService', () => ({ isSyncEnabled: jest.fn() }));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { performSync } from '../SyncService';
import { isSyncEnabled } from '../StorageService';
import {
  registerBackgroundSync,
  unregisterBackgroundSync,
  isBackgroundSyncRegistered,
  getBackgroundFetchStatus,
  triggerManualSync,
  BACKGROUND_SYNC_TASK,
} from '../BackgroundSyncTask';

const mockDefineTask = TaskManager.defineTask as jest.Mock;
const mockIsTaskRegisteredAsync = TaskManager.isTaskRegisteredAsync as jest.Mock;
const mockRegisterTaskAsync = BackgroundFetch.registerTaskAsync as jest.Mock;
const mockUnregisterTaskAsync = BackgroundFetch.unregisterTaskAsync as jest.Mock;
const mockGetStatusAsync = BackgroundFetch.getStatusAsync as jest.Mock;
const mockPerformSync = performSync as jest.Mock;
const mockIsSyncEnabled = isSyncEnabled as jest.Mock;

// The task is registered once at module load via defineTask. Capture the
// name + callback now, before beforeEach's clearAllMocks wipes the call record.
const capturedTaskName = mockDefineTask.mock.calls[0][0] as string;
const capturedTaskFn = mockDefineTask.mock.calls[0][1] as () => Promise<unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('background task callback', () => {
  it('was registered under the expected task name', () => {
    expect(capturedTaskName).toBe(BACKGROUND_SYNC_TASK);
    expect(capturedTaskFn).toBeInstanceOf(Function);
  });

  it('returns NoData when sync is disabled', async () => {
    mockIsSyncEnabled.mockResolvedValue(false);
    expect(await capturedTaskFn!()).toBe(1);
    expect(mockPerformSync).not.toHaveBeenCalled();
  });

  it('returns NewData when activities were processed', async () => {
    mockIsSyncEnabled.mockResolvedValue(true);
    mockPerformSync.mockResolvedValue({ success: true, processedCount: 3 });
    expect(await capturedTaskFn!()).toBe(2);
  });

  it('returns NoData on a successful sync with nothing new', async () => {
    mockIsSyncEnabled.mockResolvedValue(true);
    mockPerformSync.mockResolvedValue({ success: true, processedCount: 0 });
    expect(await capturedTaskFn!()).toBe(1);
  });

  it('returns Failed when the sync fails', async () => {
    mockIsSyncEnabled.mockResolvedValue(true);
    mockPerformSync.mockResolvedValue({ success: false, error: 'x' });
    expect(await capturedTaskFn!()).toBe(3);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('returns Failed and logs when the task throws', async () => {
    mockIsSyncEnabled.mockRejectedValue(new Error('boom'));
    expect(await capturedTaskFn!()).toBe(3);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('registerBackgroundSync', () => {
  it('registers the task when not already registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValue(false);
    mockRegisterTaskAsync.mockResolvedValue(undefined);

    expect(await registerBackgroundSync()).toBe(true);
    expect(mockRegisterTaskAsync).toHaveBeenCalledWith(
      BACKGROUND_SYNC_TASK,
      expect.objectContaining({ minimumInterval: 900, startOnBoot: true }),
    );
  });

  it('is a no-op when already registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValue(true);
    expect(await registerBackgroundSync()).toBe(true);
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
  });

  it('returns false and logs on error', async () => {
    mockIsTaskRegisteredAsync.mockRejectedValue(new Error('fail'));
    expect(await registerBackgroundSync()).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('unregisterBackgroundSync', () => {
  it('unregisters when registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValue(true);
    mockUnregisterTaskAsync.mockResolvedValue(undefined);
    expect(await unregisterBackgroundSync()).toBe(true);
    expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK);
  });

  it('is a no-op when not registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValue(false);
    expect(await unregisterBackgroundSync()).toBe(true);
    expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
  });

  it('returns false and logs on error', async () => {
    mockIsTaskRegisteredAsync.mockRejectedValue(new Error('fail'));
    expect(await unregisterBackgroundSync()).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('isBackgroundSyncRegistered', () => {
  it('reflects TaskManager state', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValue(true);
    expect(await isBackgroundSyncRegistered()).toBe(true);
  });

  it('returns false and logs on error', async () => {
    mockIsTaskRegisteredAsync.mockRejectedValue(new Error('fail'));
    expect(await isBackgroundSyncRegistered()).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('getBackgroundFetchStatus', () => {
  it('maps an available status', async () => {
    mockGetStatusAsync.mockResolvedValue(3);
    expect(await getBackgroundFetchStatus()).toEqual({
      status: 3,
      statusName: 'Available',
      isAvailable: true,
    });
  });

  it('maps a denied status', async () => {
    mockGetStatusAsync.mockResolvedValue(2);
    const res = await getBackgroundFetchStatus();
    expect(res.statusName).toBe('Denied');
    expect(res.isAvailable).toBe(false);
  });

  it('treats a null status as denied', async () => {
    mockGetStatusAsync.mockResolvedValue(null);
    const res = await getBackgroundFetchStatus();
    expect(res.status).toBe(2);
  });

  it('returns an error shape and logs when getStatusAsync throws', async () => {
    mockGetStatusAsync.mockRejectedValue(new Error('boom'));
    const res = await getBackgroundFetchStatus();
    expect(res.statusName).toBe('Error');
    expect(res.isAvailable).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('triggerManualSync', () => {
  it('flattens the performSync result', async () => {
    mockPerformSync.mockResolvedValue({ success: true, processedCount: 5, skippedCount: 1 });
    expect(await triggerManualSync()).toEqual({ success: true, processedCount: 5, error: undefined });
  });
});
