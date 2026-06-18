/**
 * Tests for the Android Health Connect bridge. The native module and Platform
 * are mocked. The module conditionally requires Health Connect at load time
 * when Platform.OS === 'android', so the "available" path is the default; the
 * "unavailable" path uses an isolated re-import with Platform.OS === 'ios'.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'android', Version: 34 } }));
import { Platform } from 'react-native';
const mockPlatform = Platform as unknown as { OS: 'ios' | 'android'; Version: number };

jest.mock('react-native-health-connect', () => ({
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  getGrantedPermissions: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
  requestExerciseRoute: jest.fn(),
  openHealthConnectSettings: jest.fn(),
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

import * as HealthConnect from 'react-native-health-connect';
import {
  mapExerciseType,
  checkAvailability,
  initializeHealthConnect,
  checkAndRequestPermissions,
  queryNewWorkouts,
  isHealthConnectAvailable,
  openHealthConnectSettings,
  convertToSyncPayload,
  EXERCISE_TYPE_MAP,
} from '../AndroidHealthService';

const mockGetSdkStatus = HealthConnect.getSdkStatus as jest.Mock;
const mockInitialize = HealthConnect.initialize as jest.Mock;
const mockGetGrantedPermissions = HealthConnect.getGrantedPermissions as jest.Mock;
const mockRequestPermission = HealthConnect.requestPermission as jest.Mock;
const mockReadRecords = HealthConnect.readRecords as jest.Mock;
const mockRequestExerciseRoute = HealthConnect.requestExerciseRoute as jest.Mock;
const mockOpenSettings = HealthConnect.openHealthConnectSettings as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockInitialize.mockResolvedValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('mapExerciseType', () => {
  it('maps known exercise types', () => {
    expect(mapExerciseType(56)).toBe('Running');
    expect(mapExerciseType(70)).toBe('Weight Training');
    expect(EXERCISE_TYPE_MAP[83]).toBe('Yoga');
  });

  it('falls back to a synthetic name for unknown types', () => {
    expect(mapExerciseType(9999)).toBe('Exercise_9999');
  });
});

describe('checkAvailability', () => {
  it('reports available for SDK status 3', async () => {
    mockGetSdkStatus.mockResolvedValue(3);
    expect(await checkAvailability()).toEqual({ isAvailable: true, status: 'Available' });
  });

  it('reports update-required for SDK status 2', async () => {
    mockGetSdkStatus.mockResolvedValue(2);
    expect(await checkAvailability()).toEqual({
      isAvailable: false,
      status: 'Health Connect app needs update',
    });
  });

  it('reports not-installed for other SDK statuses', async () => {
    mockGetSdkStatus.mockResolvedValue(1);
    expect(await checkAvailability()).toEqual({
      isAvailable: false,
      status: 'Health Connect not installed',
    });
  });

  it('handles a thrown error', async () => {
    mockGetSdkStatus.mockRejectedValue(new Error('boom'));
    const res = await checkAvailability();
    expect(res.isAvailable).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('initializeHealthConnect', () => {
  it('returns the native initialize result', async () => {
    mockInitialize.mockResolvedValue(true);
    expect(await initializeHealthConnect()).toBe(true);
  });

  it('returns false and logs on error', async () => {
    mockInitialize.mockRejectedValue(new Error('fail'));
    expect(await initializeHealthConnect()).toBe(false);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('checkAndRequestPermissions', () => {
  it('short-circuits when exercise + heart rate are already granted', async () => {
    mockGetGrantedPermissions.mockResolvedValue([
      { recordType: 'ExerciseSession', accessType: 'read' },
      { recordType: 'HeartRate', accessType: 'read' },
    ]);

    const res = await checkAndRequestPermissions();

    expect(res.granted).toBe(true);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('requests permissions when not already granted', async () => {
    mockGetGrantedPermissions.mockResolvedValue([]);
    mockRequestPermission.mockResolvedValue([
      { recordType: 'ExerciseSession' },
      { recordType: 'HeartRate' },
    ]);

    const res = await checkAndRequestPermissions();

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(res.granted).toBe(true);
    expect(res.permissions).toEqual([
      { recordType: 'ExerciseSession', granted: true },
      { recordType: 'HeartRate', granted: true },
    ]);
  });

  it('reports not-granted when the request returns nothing useful', async () => {
    mockGetGrantedPermissions.mockResolvedValue([]);
    mockRequestPermission.mockResolvedValue([]);

    const res = await checkAndRequestPermissions();

    expect(res.granted).toBe(false);
  });

  it('returns not-granted and logs on error', async () => {
    mockGetGrantedPermissions.mockRejectedValue(new Error('fail'));
    const res = await checkAndRequestPermissions();
    expect(res).toEqual({ granted: false, permissions: [] });
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('queryNewWorkouts', () => {
  const since = new Date('2026-01-01T00:00:00Z');

  it('returns [] and logs when SDK init fails', async () => {
    mockInitialize.mockRejectedValue(new Error('init fail'));
    expect(await queryNewWorkouts(since)).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('returns [] when there are no sessions', async () => {
    mockReadRecords.mockResolvedValue({ records: [] });
    expect(await queryNewWorkouts(since)).toEqual([]);
  });

  it('maps a session with HR, calories, distance and inline route (DATA)', async () => {
    mockReadRecords.mockImplementation((type: string) => {
      switch (type) {
        case 'ExerciseSession':
          return Promise.resolve({
            records: [
              {
                metadata: { id: 's1' },
                exerciseType: 56,
                startTime: '2026-01-02T10:00:00Z',
                endTime: '2026-01-02T10:30:00Z',
                exerciseRoute: {
                  type: 0,
                  route: [
                    { latitude: 1, longitude: 2, altitude: { inMeters: 5 }, time: '2026-01-02T10:01:00Z' },
                  ],
                },
              },
            ],
          });
        case 'HeartRate':
          return Promise.resolve({
            records: [{ samples: [{ time: '2026-01-02T10:05:00Z', beatsPerMinute: 150 }] }],
          });
        case 'TotalCaloriesBurned':
          return Promise.resolve({ records: [{ energy: { inKilocalories: 200.4 } }] });
        case 'Distance':
          return Promise.resolve({ records: [{ distance: { inMeters: 5000 } }] });
        default:
          return Promise.resolve({ records: [] });
      }
    });

    const [activity] = await queryNewWorkouts(since);

    expect(activity.externalId).toBe('s1');
    expect(activity.activityName).toBe('Running');
    expect(activity.duration).toBe(1800);
    expect(activity.calories).toBe(200);
    expect(activity.distance).toBe(5000);
    expect(activity.heartRateSamples).toEqual([
      { timestamp: new Date('2026-01-02T10:05:00Z'), bpm: 150 },
    ]);
    expect(activity.route).toEqual([
      { latitude: 1, longitude: 2, altitude: 5, timestamp: new Date('2026-01-02T10:01:00Z') },
    ]);
    expect(activity.source).toBe('health_connect');
  });

  it('requests route consent when type is CONSENT_REQUIRED (2)', async () => {
    mockReadRecords.mockImplementation((type: string) => {
      if (type === 'ExerciseSession') {
        return Promise.resolve({
          records: [
            {
              metadata: { id: 's2' },
              exerciseType: 79,
              startTime: '2026-01-02T10:00:00Z',
              endTime: '2026-01-02T10:10:00Z',
              exerciseRoute: { type: 2 },
            },
          ],
        });
      }
      return Promise.resolve({ records: [] });
    });
    mockRequestExerciseRoute.mockResolvedValue({
      route: [{ latitude: 9, longitude: 8, time: '2026-01-02T10:02:00Z' }],
    });

    const [activity] = await queryNewWorkouts(since);

    expect(mockRequestExerciseRoute).toHaveBeenCalledWith('s2');
    expect(activity.route).toEqual([
      { latitude: 9, longitude: 8, altitude: undefined, timestamp: new Date('2026-01-02T10:02:00Z') },
    ]);
  });

  it('treats NO_DATA route (type 1) as no route', async () => {
    mockReadRecords.mockImplementation((type: string) => {
      if (type === 'ExerciseSession') {
        return Promise.resolve({
          records: [
            {
              metadata: { id: 's3' },
              exerciseType: 79,
              startTime: '2026-01-02T10:00:00Z',
              endTime: '2026-01-02T10:10:00Z',
              exerciseRoute: { type: 1 },
            },
          ],
        });
      }
      return Promise.resolve({ records: [] });
    });

    const [activity] = await queryNewWorkouts(since);

    expect(activity.route).toBeUndefined();
    expect(activity.calories).toBeUndefined();
    expect(activity.distance).toBeUndefined();
  });

  it('returns [] and logs when the session query throws', async () => {
    mockReadRecords.mockRejectedValue(new Error('read fail'));
    expect(await queryNewWorkouts(since)).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('isHealthConnectAvailable', () => {
  it('is true on android with the module loaded', () => {
    expect(isHealthConnectAvailable()).toBe(true);
  });
});

describe('openHealthConnectSettings', () => {
  it('delegates to the native module', async () => {
    mockOpenSettings.mockResolvedValue(undefined);
    await openHealthConnectSettings();
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('logs on error', async () => {
    mockOpenSettings.mockRejectedValue(new Error('fail'));
    await openHealthConnectSettings();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('convertToSyncPayload', () => {
  it('wraps activities with the android device descriptor', () => {
    const payload = convertToSyncPayload([]);
    expect(payload.device.platform).toBe('android');
    expect(payload.device.osVersion).toBe('34');
  });
});

describe('when Health Connect is unavailable (non-android)', () => {
  function loadIos() {
    let mod!: typeof import('../AndroidHealthService');
    jest.isolateModules(() => {
      mockPlatform.OS = 'ios';
      mod = require('../AndroidHealthService');
    });
    return mod;
  }

  afterEach(() => {
    mockPlatform.OS = 'android';
  });

  it('all queries short-circuit with empty/unavailable results', async () => {
    const mod = loadIos();
    expect(await mod.checkAvailability()).toEqual({ isAvailable: false, status: 'Library not loaded' });
    expect(await mod.initializeHealthConnect()).toBe(false);
    expect(await mod.checkAndRequestPermissions()).toEqual({ granted: false, permissions: [] });
    expect(await mod.queryNewWorkouts(new Date())).toEqual([]);
    expect(mod.isHealthConnectAvailable()).toBe(false);
    await expect(mod.openHealthConnectSettings()).resolves.toBeUndefined();
  });
});
