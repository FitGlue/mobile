/**
 * Unsupported-platform tests for the useHealth hook (neither native module is
 * captured at load when Platform.OS is web).
 */

jest.mock('react-native', () => ({ Platform: { OS: 'web', Version: 1 } }));

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
jest.mock('../../utils/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../services/AndroidHealthService', () => ({ mapExerciseType: (n: number) => `EX_${n}` }));
jest.mock('../../services/AppleHealthService', () => ({ mapActivityType: (t: string) => `HK_${t}` }));
jest.mock('../../services/StorageService', () => ({
  setHealthState: jest.fn(),
  getHealthState: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as StorageService from '../../services/StorageService';
import { useHealth } from '../useHealth';

const mockGetHealthState = StorageService.getHealthState as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (StorageService.setHealthState as jest.Mock).mockResolvedValue(undefined);
  mockGetHealthState.mockResolvedValue({
    isInitialized: false,
    permissions: { workouts: false, heartRate: false, routes: false },
    connectionStatus: 'idle',
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function render() {
  const utils = renderHook(() => useHealth());
  await waitFor(() => expect(mockGetHealthState).toHaveBeenCalled());
  return utils;
}

describe('useHealth (unsupported platform)', () => {
  it('initialize reports the platform is unsupported', async () => {
    const { result } = await render();

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.initialize();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/not available on this platform/i);
  });

  it('getWorkouts returns [] and requestPermissions returns current perms', async () => {
    const { result } = await render();

    let workouts!: unknown[];
    let perms!: Awaited<ReturnType<typeof result.current.requestPermissions>>;
    await act(async () => {
      workouts = await result.current.getWorkouts(new Date(), new Date());
      perms = await result.current.requestPermissions();
    });

    expect(workouts).toEqual([]);
    expect(perms).toEqual({ workouts: false, heartRate: false, routes: false });
  });
});
