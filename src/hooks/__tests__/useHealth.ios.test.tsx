/**
 * iOS-path tests for the useHealth hook. The hook captures the native module at
 * module-load time keyed on Platform.OS, so this file pins Platform.OS = 'ios'
 * in the react-native mock and imports the hook once (no module reloading,
 * which would duplicate React and break hooks).
 */

jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: 17 } }));

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
import * as HK from '@kingstinct/react-native-healthkit';
import { post } from '../../config/api';
import * as StorageService from '../../services/StorageService';
import { useHealth } from '../useHealth';

const mockIsHealthDataAvailable = HK.isHealthDataAvailable as jest.Mock;
const mockRequestAuthorization = HK.requestAuthorization as jest.Mock;
const mockQueryWorkoutSamples = HK.queryWorkoutSamples as jest.Mock;
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
  mockIsHealthDataAvailable.mockResolvedValue(true);
  mockRequestAuthorization.mockResolvedValue(undefined);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function render() {
  const utils = renderHook(() => useHealth());
  await waitFor(() => expect(mockGetHealthState).toHaveBeenCalled());
  return utils;
}

describe('useHealth (iOS)', () => {
  it('initialize requests authorization and flips availability/initialized', async () => {
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(true);
    expect(mockRequestAuthorization).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isAvailable).toBe(true);
  });

  it('initialize fails and sets an error when HealthKit data is unavailable', async () => {
    mockIsHealthDataAvailable.mockResolvedValue(false);
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/not available/i);
  });

  it('requestPermissions registers apple-health and marks connected', async () => {
    const { result } = await render();

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(mockPost).toHaveBeenCalledWith('/connect/apple-health');
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.permissions).toEqual({ workouts: true, heartRate: true, routes: true });
  });

  it('requestPermissions marks error when the backend rejects the connect call', async () => {
    mockPost.mockResolvedValue({ error: 'nope' });
    const { result } = await render();

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(result.current.connectionStatus).toBe('error');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('requestPermissions marks error on a network exception', async () => {
    mockPost.mockRejectedValue(new Error('offline'));
    const { result } = await render();

    await act(async () => {
      await result.current.requestPermissions();
    });

    expect(result.current.connectionStatus).toBe('error');
  });

  it('getWorkouts maps HealthKit samples reverse-chronologically', async () => {
    mockQueryWorkoutSamples.mockResolvedValue({
      samples: [
        { uuid: 'a', workoutActivityType: 'Running', startDate: '2026-01-01T10:00:00Z', endDate: '2026-01-01T11:00:00Z', duration: 3600, totalEnergyBurned: 500.7, totalDistance: 9000 },
        { uuid: 'b', workoutActivityType: 'Walking', startDate: '2026-01-03T10:00:00Z', endDate: '2026-01-03T10:30:00Z', duration: 1800 },
      ],
    });
    const { result } = await render();

    let workouts!: Awaited<ReturnType<typeof result.current.getWorkouts>>;
    await act(async () => {
      workouts = await result.current.getWorkouts(new Date('2026-01-01'), new Date('2026-01-04'));
    });

    expect(workouts).toHaveLength(2);
    expect(workouts[0].id).toBe('b'); // most recent first
    expect(workouts[1].type).toBe('HK_Running');
    expect(workouts[1].calories).toBe(501);
  });

  it('safeNativeCall captures a thrown native error and returns the fallback', async () => {
    mockIsHealthDataAvailable.mockRejectedValue(new Error('kaput'));
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/Initialize: kaput/);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('restores persisted state on mount', async () => {
    mockGetHealthState.mockResolvedValue({
      isInitialized: true,
      permissions: { workouts: true, heartRate: true, routes: false },
      connectionStatus: 'connected',
    });

    const { result } = await render();

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.permissions.workouts).toBe(true);
  });
});
