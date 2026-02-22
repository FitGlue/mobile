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
export const EXERCISE_TYPE_MAP: Record<number, string> = {
  0: 'Workout',            // EXERCISE_TYPE_OTHER_WORKOUT
  2: 'Badminton',          // EXERCISE_TYPE_BADMINTON
  4: 'Baseball',           // EXERCISE_TYPE_BASEBALL
  5: 'Basketball',         // EXERCISE_TYPE_BASKETBALL
  8: 'Cycling',            // EXERCISE_TYPE_BIKING
  9: 'Cycling',            // EXERCISE_TYPE_BIKING_STATIONARY
  10: 'Workout',           // EXERCISE_TYPE_BOOT_CAMP
  11: 'Boxing',            // EXERCISE_TYPE_BOXING
  13: 'Workout',           // EXERCISE_TYPE_CALISTHENICS
  14: 'Cricket',           // EXERCISE_TYPE_CRICKET
  16: 'Dancing',           // EXERCISE_TYPE_DANCING
  25: 'Elliptical',        // EXERCISE_TYPE_ELLIPTICAL
  26: 'Workout',           // EXERCISE_TYPE_EXERCISE_CLASS
  27: 'Fencing',           // EXERCISE_TYPE_FENCING
  28: 'Football',          // EXERCISE_TYPE_FOOTBALL_AMERICAN
  29: 'Football',          // EXERCISE_TYPE_FOOTBALL_AUSTRALIAN
  31: 'Frisbee',           // EXERCISE_TYPE_FRISBEE_DISC
  32: 'Golf',              // EXERCISE_TYPE_GOLF
  33: 'Meditation',        // EXERCISE_TYPE_GUIDED_BREATHING
  34: 'Gymnastics',        // EXERCISE_TYPE_GYMNASTICS
  35: 'Handball',          // EXERCISE_TYPE_HANDBALL
  36: 'HIIT',              // EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
  37: 'Hiking',            // EXERCISE_TYPE_HIKING
  38: 'Hockey',            // EXERCISE_TYPE_ICE_HOCKEY
  39: 'Ice Skating',       // EXERCISE_TYPE_ICE_SKATING
  44: 'Martial Arts',      // EXERCISE_TYPE_MARTIAL_ARTS
  46: 'Stand Up Paddling', // EXERCISE_TYPE_PADDLING
  47: 'Paragliding',       // EXERCISE_TYPE_PARAGLIDING
  48: 'Pilates',           // EXERCISE_TYPE_PILATES
  50: 'Racquetball',       // EXERCISE_TYPE_RACQUETBALL
  51: 'Rock Climbing',     // EXERCISE_TYPE_ROCK_CLIMBING
  52: 'Hockey',            // EXERCISE_TYPE_ROLLER_HOCKEY
  53: 'Rowing',            // EXERCISE_TYPE_ROWING
  54: 'Rowing',            // EXERCISE_TYPE_ROWING_MACHINE
  55: 'Rugby',             // EXERCISE_TYPE_RUGBY
  56: 'Running',           // EXERCISE_TYPE_RUNNING
  57: 'Running',           // EXERCISE_TYPE_RUNNING_TREADMILL
  58: 'Sailing',           // EXERCISE_TYPE_SAILING
  59: 'Scuba Diving',      // EXERCISE_TYPE_SCUBA_DIVING
  60: 'Ice Skating',       // EXERCISE_TYPE_SKATING
  61: 'Alpine Ski',        // EXERCISE_TYPE_SKIING
  62: 'Snowboarding',      // EXERCISE_TYPE_SNOWBOARDING
  63: 'Snowshoeing',       // EXERCISE_TYPE_SNOWSHOEING
  64: 'Soccer',            // EXERCISE_TYPE_SOCCER
  65: 'Softball',          // EXERCISE_TYPE_SOFTBALL
  66: 'Squash',            // EXERCISE_TYPE_SQUASH
  68: 'Stair Climbing',    // EXERCISE_TYPE_STAIR_CLIMBING
  69: 'Stair Climbing',    // EXERCISE_TYPE_STAIR_CLIMBING_MACHINE
  70: 'Weight Training',   // EXERCISE_TYPE_STRENGTH_TRAINING
  71: 'Stretching',        // EXERCISE_TYPE_STRETCHING
  72: 'Surfing',           // EXERCISE_TYPE_SURFING
  73: 'Swimming',          // EXERCISE_TYPE_SWIMMING_OPEN_WATER
  74: 'Swimming',          // EXERCISE_TYPE_SWIMMING_POOL
  75: 'Table Tennis',      // EXERCISE_TYPE_TABLE_TENNIS
  76: 'Tennis',            // EXERCISE_TYPE_TENNIS
  78: 'Volleyball',        // EXERCISE_TYPE_VOLLEYBALL
  79: 'Walking',           // EXERCISE_TYPE_WALKING
  80: 'Water Polo',        // EXERCISE_TYPE_WATER_POLO
  81: 'Weight Training',   // EXERCISE_TYPE_WEIGHTLIFTING
  82: 'Wheelchair',        // EXERCISE_TYPE_WHEELCHAIR
  83: 'Yoga',              // EXERCISE_TYPE_YOGA
};

/**
 * Map Health Connect exercise type to activity name
 */
export function mapExerciseType(exerciseType: number): string {
  return EXERCISE_TYPE_MAP[exerciseType] || `Exercise_${exerciseType}`;
}

/**
 * Permission records required for workout sync
 */
const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
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
 * Query total calories burned for a session time window
 */
async function getCaloriesForSession(
  startTime: Date,
  endTime: Date
): Promise<number | undefined> {
  if (!HealthConnect) return undefined;

  try {
    const result = await HealthConnect.readRecords('TotalCaloriesBurned', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    if (!result?.records || result.records.length === 0) return undefined;

    // Sum all calorie records in the time window
    let totalCalories = 0;
    for (const record of result.records) {
      if (record.energy?.inKilocalories != null) {
        totalCalories += record.energy.inKilocalories;
      }
    }

    return totalCalories > 0 ? Math.round(totalCalories) : undefined;
  } catch (e) {
    console.warn('[AndroidHealthService] Failed to get calories:', e);
    return undefined;
  }
}

/**
 * Query distance for a session time window
 */
async function getDistanceForSession(
  startTime: Date,
  endTime: Date
): Promise<number | undefined> {
  if (!HealthConnect) return undefined;

  try {
    const result = await HealthConnect.readRecords('Distance', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    if (!result?.records || result.records.length === 0) return undefined;

    // Sum all distance records in the time window (in meters)
    let totalDistance = 0;
    for (const record of result.records) {
      if (record.distance?.inMeters != null) {
        totalDistance += record.distance.inMeters;
      }
    }

    return totalDistance > 0 ? totalDistance : undefined;
  } catch (e) {
    console.warn('[AndroidHealthService] Failed to get distance:', e);
    return undefined;
  }
}

/**
 * Extract GPS route data from an ExerciseSession.
 *
 * Health Connect uses a two-phase route access model:
 * - readRecords() returns exerciseRoute.type = DATA | NO_DATA | CONSENT_REQUIRED
 * - If DATA, the Location[] is already inline
 * - If CONSENT_REQUIRED, call requestExerciseRoute(recordId) to prompt user
 */
async function getRouteForSession(
  session: any
): Promise<RoutePoint[]> {
  if (!HealthConnect) return [];

  try {
    const exerciseRoute = session.exerciseRoute;
    if (!exerciseRoute) return [];

    // ExerciseRouteResultType: DATA = 0, NO_DATA = 1, CONSENT_REQUIRED = 2
    if (exerciseRoute.type === 1) {
      // NO_DATA — workout has no route
      return [];
    }

    let locations = exerciseRoute.route;

    if (exerciseRoute.type === 2) {
      // CONSENT_REQUIRED — need to request route access
      const recordId = session.metadata?.id;
      if (!recordId || !HealthConnect.requestExerciseRoute) return [];

      try {
        const routeResult = await HealthConnect.requestExerciseRoute(recordId);
        locations = routeResult?.route;
      } catch (e) {
        console.warn('[AndroidHealthService] Route consent denied or failed:', e);
        return [];
      }
    }

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return [];
    }

    return locations.map((loc: any) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      altitude: loc.altitude?.inMeters,
      timestamp: new Date(loc.time),
    }));
  } catch (e) {
    console.warn('[AndroidHealthService] Failed to get route:', e);
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

  // Ensure the SDK is initialized — critical for cold-start background sync
  // where the app was killed and the background task wakes it
  try {
    await HealthConnect.initialize();
  } catch (e) {
    console.error('[AndroidHealthService] SDK initialization failed in queryNewWorkouts:', e);
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

        // Get calories, distance, and GPS route
        const calories = await getCaloriesForSession(startTime, endTime);
        const distance = await getDistanceForSession(startTime, endTime);
        const route = await getRouteForSession(session);

        const activity: StandardizedActivity = {
          externalId: session.metadata?.id,
          activityName: mapExerciseType(session.exerciseType || 0),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          calories,
          distance,
          heartRateSamples,
          route: route.length > 0 ? route : undefined,
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
