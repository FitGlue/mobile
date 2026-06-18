/**
 * Android-path tests for the useHealth hook. Pins Platform.OS = 'android' so the
 * Health Connect native module is the one captured at module-load.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'android', Version: 34 } }));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
  queryWorkoutSamples: jest.fn(),
}));
jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
}));

jest.mock('../../config/api', () => ({
  post: jest.fn(),
  endpoints: { mobileConnect: (p: string) => `/connect/${p}` },
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

jest.mock('../../services/AndroidHealthService', () => ({ mapExerciseType: (n: number) => `EX_${n}` }));
jest.mock('../../services/AppleHealthService', () => ({ mapActivityType: (t: string) => `HK_${t}` }));

jest.mock('../../services/StorageService', () => ({
  setHealthState: jest.fn(),
  getHealthState: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as HC from 'react-native-health-connect';
import { post } from '../../config/api';
import * as StorageService from '../../services/StorageService';
import { useHealth } from '../useHealth';

const mockHCInitialize = HC.initialize as jest.Mock;
const mockHCRequestPermission = HC.requestPermission as jest.Mock;
const mockHCReadRecords = HC.readRecords as jest.Mock;
const mockPost = post as jest.Mock;
const mockSetHealthState = StorageService.setHealthState as jest.Mock;
const mockGetHealthState = StorageService.getHealthState as jest.Mock;

const NO_RESTORE = {
  isInitialized: false,
  permissions: { workouts: false, heartRate: false, routes: false },
  connectionStatus: 'idle' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSetHealthState.mockResolvedValue(undefined);
  mockGetHealthState.mockResolvedValue(NO_RESTORE);
  mockPost.mockResolvedValue({ status: 200 });
  mockHCInitialize.mockResolvedValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function render() {
  const utils = renderHook(() => useHealth());
  await waitFor(() => expect(mockGetHealthState).toHaveBeenCalled());
  return utils;
}

describe('useHealth (Android)', () => {
  it('initialize delegates to Health Connect initialize', async () => {
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(true);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isAvailable).toBe(true);
  });

  it('initialize reflects a false initialize result', async () => {
    mockHCInitialize.mockResolvedValue(false);
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(false);
    expect(result.current.isInitialized).toBe(false);
  });

  it('requestPermissions parses granted records and connects health-connect', async () => {
    mockHCRequestPermission.mockResolvedValue([
      { recordType: 'ExerciseSession' },
      { recordType: 'HeartRate' },
    ]);
    const { result } = await render();

    let perms!: Awaited<ReturnType<typeof result.current.requestPermissions>>;
    await act(async () => {
      perms = await result.current.requestPermissions();
    });

    expect(perms.workouts).toBe(true);
    expect(perms.heartRate).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/connect/health-connect');
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('requestPermissions does not connect when workouts are not granted', async () => {
    mockHCRequestPermission.mockResolvedValue([{ recordType: 'HeartRate' }]);
    const { result } = await render();

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(result.current.permissions.workouts).toBe(false);
  });

  it('requestPermissions marks error when the backend connect call fails', async () => {
    mockHCRequestPermission.mockResolvedValue([{ recordType: 'ExerciseSession' }]);
    mockPost.mockResolvedValue({ error: 'bad' });
    const { result } = await render();

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(result.current.connectionStatus).toBe('error');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('getWorkouts maps Health Connect sessions with inline route', async () => {
    mockHCReadRecords.mockResolvedValue({
      records: [
        {
          metadata: { id: 's1' },
          exerciseType: 56,
          startTime: '2026-01-02T10:00:00Z',
          endTime: '2026-01-02T10:30:00Z',
          exerciseRoute: { type: 0, route: [{ latitude: 1, longitude: 2, altitude: { inMeters: 3 }, time: '2026-01-02T10:01:00Z' }] },
        },
      ],
    });
    const { result } = await render();

    let workouts!: Awaited<ReturnType<typeof result.current.getWorkouts>>;
    await act(async () => {
      workouts = await result.current.getWorkouts(new Date('2026-01-01'), new Date('2026-01-03'));
    });

    expect(workouts[0].id).toBe('s1');
    expect(workouts[0].type).toBe('EX_56');
    expect(workouts[0].route).toEqual([
      { latitude: 1, longitude: 2, altitude: 3, timestamp: new Date('2026-01-02T10:01:00Z') },
    ]);
  });

  it('restores persisted state and silently re-inits the SDK on mount', async () => {
    mockGetHealthState.mockResolvedValue({
      isInitialized: true,
      permissions: { workouts: true, heartRate: false, routes: false },
      connectionStatus: 'connected',
    });

    const { result } = await render();

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(mockHCInitialize).toHaveBeenCalled();
  });
});
