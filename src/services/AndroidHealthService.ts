/**
 * Android Health Service
 *
 * Android Health Connect bridge for querying workouts with heart rate data.
 * Uses react-native-health-connect library.
 * Handles Android 14+ permission model correctly.
 */

import { Platform } from 'react-native';
import type { HeartRateSample, RoutePoint } from '../types/health';

// Conditionally import Health Connect (only works in development builds)
let HealthConnect: any = null;

if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch (e) {
    console.warn('[AndroidHealthService] react-native-health-connect not available');
  }
}

/**
 * Standardized activity payload for syncing to backend
 */
export interface StandardizedActivity {
  externalId?: string;
  activityName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration: number; // seconds
  calories?: number;
  distance?: number; // meters
  heartRateSamples: HeartRateSample[];
  route?: RoutePoint[];
  source: 'health_connect';
}

/**
 * Health Connect exercise type to activity name mapping
 */
const EXERCISE_TYPE_MAP: Record<number, string> = {
  0: 'Unknown',
  1: 'Badminton',
  2: 'Baseball',
  3: 'Basketball',
  4: 'Biking',
  5: 'BikingStationary',
  6: 'BootCamp',
  7: 'Boxing',
  8: 'Calisthenics',
  9: 'Cricket',
  10: 'Dancing',
  11: 'Elliptical',
  12: 'ExerciseClass',
  13: 'Fencing',
  14: 'Football (American)',
  15: 'Football (Australian)',
  16: 'Frisbee',
  17: 'Golf',
  18: 'GuidedBreathing',
  19: 'Gymnastics',
  20: 'Handball',
  21: 'HIIT',
  22: 'Hiking',
  23: 'Hockey',
  24: 'HorsebackRiding',
  25: 'Housework',
  26: 'IceSkating',
  27: 'JumpingRope',
  28: 'Kayaking',
  29: 'MartialArts',
  30: 'Meditation',
  31: 'Paddling',
  32: 'Paragliding',
  33: 'Pilates',
  34: 'Racquetball',
  35: 'RockClimbing',
  36: 'RollerHockey',
  37: 'Rowing',
  38: 'RowingMachine',
  39: 'Rugby',
  40: 'Running',
  41: 'RunningTreadmill',
  42: 'Sailing',
  43: 'ScubaDiving',
  44: 'Skating',
  45: 'Skiing',
  46: 'SkiingCrossCountry',
  47: 'SkiingDownhill',
  48: 'Snowboarding',
  49: 'Snowshoeing',
  50: 'Soccer',
  51: 'Softball',
  52: 'Squash',
  53: 'StairClimbing',
  54: 'StairClimbingMachine',
  55: 'StrengthTraining',
  56: 'Stretching',
  57: 'Surfing',
  58: 'Swimming',
  59: 'SwimmingOpenWater',
  60: 'SwimmingPool',
  61: 'TableTennis',
  62: 'Tennis',
  63: 'Volleyball',
  64: 'Walking',
  65: 'WaterPolo',
  66: 'Weightlifting',
  67: 'Wheelchair',
  68: 'Yoga',
};

/**
 * Map Health Connect exercise type to activity name
 */
function mapExerciseType(exerciseType: number): string {
  return EXERCISE_TYPE_MAP[exerciseType] || `Exercise_${exerciseType}`;
}

/**
 * Permission records required for workout sync
 */
const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  // ExerciseRoute may require additional permissions
];

/**
 * Check if Health Connect is available
 */
export async function checkAvailability(): Promise<{
  isAvailable: boolean;
  status: string;
}> {
  if (!HealthConnect) {
    return { isAvailable: false, status: 'Library not loaded' };
  }

  try {
    const status = await HealthConnect.getSdkStatus();

    // SDK Status values:
    // 1 = SDK_UNAVAILABLE
    // 2 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
    // 3 = SDK_AVAILABLE

    if (status === 3) {
      return { isAvailable: true, status: 'Available' };
    } else if (status === 2) {
      return { isAvailable: false, status: 'Health Connect app needs update' };
    } else {
      return { isAvailable: false, status: 'Health Connect not installed' };
    }
  } catch (e) {
    console.error('[AndroidHealthService] Failed to check availability:', e);
    return { isAvailable: false, status: 'Error checking availability' };
  }
}

/**
 * Initialize Health Connect
 */
export async function initializeHealthConnect(): Promise<boolean> {
  if (!HealthConnect) {
    return false;
  }

  try {
    const result = await HealthConnect.initialize();
    console.log('[AndroidHealthService] Health Connect initialized:', result);
    return result;
  } catch (e) {
    console.error('[AndroidHealthService] Failed to initialize:', e);
    return false;
  }
}

/**
 * Check and request required permissions
 * Handles Android 14+ permission model
 */
export async function checkAndRequestPermissions(): Promise<{
  granted: boolean;
  permissions: { recordType: string; granted: boolean }[];
}> {
  if (!HealthConnect) {
    return { granted: false, permissions: [] };
  }

  try {
    // First check current permissions
    const currentPermissions = await HealthConnect.getGrantedPermissions();

    // Check if we have all required permissions
    const hasExercise = currentPermissions.some(
      (p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
    );
    const hasHeartRate = currentPermissions.some(
      (p: any) => p.recordType === 'HeartRate' && p.accessType === 'read'
    );

    if (hasExercise && hasHeartRate) {
      return {
        granted: true,
        permissions: [
          { recordType: 'ExerciseSession', granted: true },
          { recordType: 'HeartRate', granted: true },
        ],
      };
    }

    // Request permissions
    console.log('[AndroidHealthService] Requesting permissions...');
    const result = await HealthConnect.requestPermission(REQUIRED_PERMISSIONS);

    const exerciseGranted = result.some(
      (p: any) => p.recordType === 'ExerciseSession'
    );
    const heartRateGranted = result.some(
      (p: any) => p.recordType === 'HeartRate'
    );

    return {
      granted: exerciseGranted,
      permissions: [
        { recordType: 'ExerciseSession', granted: exerciseGranted },
        { recordType: 'HeartRate', granted: heartRateGranted },
      ],
    };
  } catch (e) {
    console.error('[AndroidHealthService] Permission request failed:', e);
    return { granted: false, permissions: [] };
  }
}

/**
 * Query heart rate records for a time window
 */
async function getHeartRateRecords(
  startTime: Date,
  endTime: Date
): Promise<HeartRateSample[]> {
  if (!HealthConnect) {
    return [];
  }

  try {
    const result = await HealthConnect.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    if (!result?.records) {
      return [];
    }

    const samples: HeartRateSample[] = [];

    for (const record of result.records) {
      if (record.samples) {
        for (const sample of record.samples) {
          samples.push({
            timestamp: new Date(sample.time),
            bpm: sample.beatsPerMinute,
          });
        }
      }
    }

    return samples.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (e) {
    console.warn('[AndroidHealthService] Failed to get heart rate records:', e);
    return [];
  }
}

/**
 * Query new workouts since the last sync date
 *
 * @param lastSyncDate - Only return workouts after this date
 * @returns Array of standardized activities ready for sync
 */
export async function queryNewWorkouts(
  lastSyncDate: Date
): Promise<StandardizedActivity[]> {
  if (!HealthConnect) {
    console.warn('[AndroidHealthService] Health Connect not available');
    return [];
  }

  try {
    const endTime = new Date();

    const result = await HealthConnect.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: lastSyncDate.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    if (!result?.records || result.records.length === 0) {
      console.log('[AndroidHealthService] No new workouts found');
      return [];
    }

    console.log(`[AndroidHealthService] Found ${result.records.length} workouts since ${lastSyncDate.toISOString()}`);

    const activities: StandardizedActivity[] = [];

    for (const session of result.records) {
      try {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;

        // Get heart rate samples for this session
        const heartRateSamples = await getHeartRateRecords(startTime, endTime);

        const activity: StandardizedActivity = {
          externalId: session.metadata?.id,
          activityName: mapExerciseType(session.exerciseType || 0),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          // Note: Calories and distance may need to be read from separate record types
          // depending on how the source app records them
          heartRateSamples,
          source: 'health_connect',
        };

        activities.push(activity);
      } catch (e) {
        console.warn('[AndroidHealthService] Failed to process session:', e);
      }
    }

    console.log(`[AndroidHealthService] Processed ${activities.length} activities`);
    return activities;
  } catch (e) {
    console.error('[AndroidHealthService] Failed to query workouts:', e);
    return [];
  }
}

/**
 * Check if Health Connect is available on this device
 */
export function isHealthConnectAvailable(): boolean {
  return Platform.OS === 'android' && HealthConnect !== null;
}

/**
 * Open Health Connect app settings for permission management
 */
export async function openHealthConnectSettings(): Promise<void> {
  if (!HealthConnect) {
    return;
  }

  try {
    await HealthConnect.openHealthConnectSettings();
  } catch (e) {
    console.error('[AndroidHealthService] Failed to open settings:', e);
  }
}

/**
 * Convert queried workouts to the format expected by the sync API
 */
export function convertToSyncPayload(activities: StandardizedActivity[]): {
  activities: StandardizedActivity[];
  device: { platform: 'android'; osVersion?: string; appVersion?: string };
} {
  return {
    activities,
    device: {
      platform: 'android',
      osVersion: Platform.Version?.toString(),
    },
  };
}
