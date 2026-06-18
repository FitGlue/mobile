/**
 * Tests for the iOS HealthKit bridge. The native HealthKit module and
 * react-native Platform are mocked. The module conditionally requires HealthKit
 * at load time when Platform.OS === 'ios', so the "available" path is the
 * default; the "unavailable" path is exercised via an isolated re-import with
 * Platform.OS === 'android'.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: 17 } }));
import { Platform } from 'react-native';
const mockPlatform = Platform as unknown as { OS: 'ios' | 'android'; Version: number };

jest.mock('@kingstinct/react-native-healthkit', () => ({
  queryQuantitySamples: jest.fn(),
  getWorkoutRoutes: jest.fn(),
  queryWorkoutSamples: jest.fn(),
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

import * as HealthKit from '@kingstinct/react-native-healthkit';
import {
  mapActivityType,
  queryNewWorkouts,
  isHealthKitAvailable,
  checkAvailability,
  initializeHealthKit,
  convertToSyncPayload,
  WORKOUT_ACTIVITY_TYPES,
} from '../AppleHealthService';

const hk = HealthKit as unknown as Record<string, jest.Mock>;
const mockQueryQuantitySamples = hk.queryQuantitySamples;
const mockGetWorkoutRoutes = hk.getWorkoutRoutes;
const mockQueryWorkoutSamples = hk.queryWorkoutSamples;
const mockIsHealthDataAvailable = hk.isHealthDataAvailable;
const mockRequestAuthorization = hk.requestAuthorization;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('mapActivityType', () => {
  it('maps known HealthKit identifiers to friendly names', () => {
    expect(mapActivityType('HKWorkoutActivityTypeRunning')).toBe('Running');
    expect(mapActivityType('HKWorkoutActivityTypeTraditionalStrengthTraining')).toBe('WeightTraining');
  });

  it('strips the prefix for unknown identifiers', () => {
    expect(mapActivityType('HKWorkoutActivityTypeQuidditch')).toBe('Quidditch');
  });

  it('has a sane lookup table', () => {
    expect(WORKOUT_ACTIVITY_TYPES['HKWorkoutActivityTypeYoga']).toBe('Yoga');
  });
});

describe('isHealthKitAvailable', () => {
  it('is true on iOS with the module loaded', () => {
    expect(isHealthKitAvailable()).toBe(true);
  });
});

describe('checkAvailability', () => {
  it('returns the native availability result', async () => {
    mockIsHealthDataAvailable.mockResolvedValue(true);
    expect(await checkAvailability()).toBe(true);
  });

  it('returns false and warns when the native call throws', async () => {
    mockIsHealthDataAvailable.mockRejectedValue(new Error('no'));
    expect(await checkAvailability()).toBe(false);
  });
});

describe('initializeHealthKit', () => {
  it('requests authorization and returns true', async () => {
    mockRequestAuthorization.mockResolvedValue(undefined);
    expect(await initializeHealthKit()).toBe(true);
    expect(mockRequestAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ toRead: expect.arrayContaining(['HKWorkoutTypeIdentifier']) }),
    );
  });

  it('returns false and logs when authorization throws', async () => {
    mockRequestAuthorization.mockRejectedValue(new Error('denied'));
    expect(await initializeHealthKit()).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('convertToSyncPayload', () => {
  it('wraps activities with the iOS device descriptor', () => {
    const payload = convertToSyncPayload([]);
    expect(payload.device.platform).toBe('ios');
    expect(payload.device.osVersion).toBe('17');
    expect(payload.activities).toEqual([]);
  });
});

describe('queryNewWorkouts', () => {
  const since = new Date('2026-01-01T00:00:00Z');

  it('returns [] when no workouts are found', async () => {
    mockQueryWorkoutSamples.mockResolvedValue({ samples: [] });
    expect(await queryNewWorkouts(since)).toEqual([]);
  });

  it('maps a workout including HR samples, route, calories and distance', async () => {
    mockQueryWorkoutSamples.mockResolvedValue({
      samples: [
        {
          uuid: 'w1',
          workoutActivityType: 'HKWorkoutActivityTypeRunning',
          startDate: '2026-01-02T10:00:00Z',
          endDate: '2026-01-02T11:00:00Z',
          duration: 3600,
          totalEnergyBurned: 512.6,
          totalDistance: 10000,
        },
      ],
    });
    mockQueryQuantitySamples.mockResolvedValue({
      samples: [{ startDate: '2026-01-02T10:05:00Z', quantity: 142.7 }],
    });
    mockGetWorkoutRoutes.mockResolvedValue([
      { locations: [{ latitude: 1, longitude: 2, altitude: 3, timestamp: '2026-01-02T10:06:00Z' }] },
    ]);

    const [activity] = await queryNewWorkouts(since);

    expect(activity.externalId).toBe('w1');
    expect(activity.activityName).toBe('Running');
    expect(activity.calories).toBe(513);
    expect(activity.distance).toBe(10000);
    expect(activity.heartRateSamples).toEqual([
      { timestamp: new Date('2026-01-02T10:05:00Z'), bpm: 143 },
    ]);
    expect(activity.route).toEqual([
      { latitude: 1, longitude: 2, altitude: 3, timestamp: new Date('2026-01-02T10:06:00Z') },
    ]);
    expect(activity.source).toBe('healthkit');
  });

  it('handles a single (non-array) workout and derives duration from timestamps', async () => {
    mockQueryWorkoutSamples.mockResolvedValue({
      start: '2026-01-02T10:00:00Z',
      end: '2026-01-02T10:30:00Z',
      id: 'single',
      activityName: 'HKWorkoutActivityTypeWalking',
    });
    mockQueryQuantitySamples.mockResolvedValue({ samples: [] });
    mockGetWorkoutRoutes.mockResolvedValue([]);

    const result = await queryNewWorkouts(since);

    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('single');
    expect(result[0].duration).toBe(1800);
    expect(result[0].calories).toBeUndefined();
    expect(result[0].route).toBeUndefined();
  });

  it('returns [] and tolerates HR/route query failures (warns, no throw)', async () => {
    mockQueryWorkoutSamples.mockResolvedValue({
      samples: [{ uuid: 'w2', startDate: '2026-01-02T10:00:00Z', endDate: '2026-01-02T10:10:00Z' }],
    });
    mockQueryQuantitySamples.mockRejectedValue(new Error('hr fail'));
    mockGetWorkoutRoutes.mockRejectedValue(new Error('route fail'));

    const [activity] = await queryNewWorkouts(since);

    expect(activity.heartRateSamples).toEqual([]);
    expect(activity.route).toBeUndefined();
  });

  it('returns [] and logs when the workout query itself throws', async () => {
    mockQueryWorkoutSamples.mockRejectedValue(new Error('kaput'));
    expect(await queryNewWorkouts(since)).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('when HealthKit is unavailable (non-iOS)', () => {
  // Re-import the module with Platform.OS = android so the conditional require
  // is skipped and HealthKit stays null.
  function loadAndroid() {
    let mod!: typeof import('../AppleHealthService');
    jest.isolateModules(() => {
      mockPlatform.OS = 'android';
      mod = require('../AppleHealthService');
    });
    return mod;
  }

  afterEach(() => {
    mockPlatform.OS = 'ios';
  });

  it('queryNewWorkouts returns [] and isHealthKitAvailable is false', async () => {
    const mod = loadAndroid();
    expect(await mod.queryNewWorkouts(new Date())).toEqual([]);
    expect(mod.isHealthKitAvailable()).toBe(false);
  });

  it('checkAvailability and initializeHealthKit return false', async () => {
    const mod = loadAndroid();
    expect(await mod.checkAvailability()).toBe(false);
    expect(await mod.initializeHealthKit()).toBe(false);
  });
});
