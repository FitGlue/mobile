/**
 * Apple Health Service
 *
 * iOS HealthKit bridge for querying workouts with heart rate and GPS data.
 * Uses react-native-health library.
 */

import { Platform } from 'react-native';
import type { WorkoutData, HeartRateSample, RoutePoint } from '../types/health';

// Conditionally import HealthKit (only works in development builds)
let AppleHealthKit: any = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('[AppleHealthService] react-native-health not available');
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
  source: 'healthkit';
}

/**
 * HealthKit workout type identifiers
 */
const WORKOUT_ACTIVITY_TYPES: Record<string, string> = {
  'HKWorkoutActivityTypeRunning': 'Running',
  'HKWorkoutActivityTypeWalking': 'Walking',
  'HKWorkoutActivityTypeCycling': 'Cycling',
  'HKWorkoutActivityTypeSwimming': 'Swimming',
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeElliptical': 'Elliptical',
  'HKWorkoutActivityTypeRowing': 'Rowing',
  'HKWorkoutActivityTypeStairClimbing': 'StairClimbing',
  'HKWorkoutActivityTypeYoga': 'Yoga',
  'HKWorkoutActivityTypeHiking': 'Hiking',
  'HKWorkoutActivityTypeCrossTraining': 'CrossTraining',
  'HKWorkoutActivityTypeMixedCardio': 'Cardio',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'HIIT',
  'HKWorkoutActivityTypeCoreTraining': 'CoreTraining',
  'HKWorkoutActivityTypeFlexibility': 'Flexibility',
};

/**
 * Map HealthKit activity type to readable name
 */
function mapActivityType(hkType: string): string {
  return WORKOUT_ACTIVITY_TYPES[hkType] || hkType.replace('HKWorkoutActivityType', '');
}

/**
 * Query heart rate samples for a workout time window
 */
async function getHeartRateSamples(
  startDate: Date,
  endDate: Date
): Promise<HeartRateSample[]> {
  return new Promise((resolve, reject) => {
    if (!AppleHealthKit) {
      resolve([]);
      return;
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    AppleHealthKit.getHeartRateSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.warn('[AppleHealthService] Failed to get heart rate samples:', err);
        resolve([]);
        return;
      }

      const samples: HeartRateSample[] = results.map((sample) => ({
        timestamp: new Date(sample.startDate),
        bpm: Math.round(sample.value),
      }));

      resolve(samples);
    });
  });
}

/**
 * Query GPS route for a workout (if available)
 * Note: Workout routes require specific entitlements and may not be available
 */
async function getWorkoutRoute(
  workoutId: string,
  startDate: Date,
  endDate: Date
): Promise<RoutePoint[]> {
  // Workout routes in HealthKit are complex to access
  // For now, we'll attempt to get location data from the workout
  // Full route implementation requires HKWorkoutRouteQuery
  return new Promise((resolve) => {
    if (!AppleHealthKit) {
      resolve([]);
      return;
    }

    // Try to get distance walking/running samples which may include location
    // This is a simplified approach - full GPS requires HKWorkoutRoute
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getDistanceWalkingRunning(options, (err: any, results: any) => {
      if (err || !results?.value) {
        resolve([]);
        return;
      }

      // Note: This doesn't provide actual GPS coordinates
      // Full GPS route extraction requires native module enhancement
      resolve([]);
    });
  });
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
  return new Promise(async (resolve, reject) => {
    if (!AppleHealthKit) {
      console.warn('[AppleHealthService] HealthKit not available');
      resolve([]);
      return;
    }

    const endDate = new Date();
    const options = {
      startDate: lastSyncDate.toISOString(),
      endDate: endDate.toISOString(),
      type: 'Workout',
    };

    AppleHealthKit.getSamples(options, async (err: any, results: any[]) => {
      if (err) {
        console.error('[AppleHealthService] Failed to query workouts:', err);
        reject(err);
        return;
      }

      if (!results || results.length === 0) {
        resolve([]);
        return;
      }

      console.log(`[AppleHealthService] Found ${results.length} workouts since ${lastSyncDate.toISOString()}`);

      const activities: StandardizedActivity[] = [];

      for (const workout of results) {
        try {
          const startTime = new Date(workout.start || workout.startDate);
          const endTime = new Date(workout.end || workout.endDate);
          const duration = workout.duration ||
            (endTime.getTime() - startTime.getTime()) / 1000;

          // Get heart rate samples for this workout window
          const heartRateSamples = await getHeartRateSamples(startTime, endTime);

          // Get workout route if available
          const route = await getWorkoutRoute(workout.id, startTime, endTime);

          const activity: StandardizedActivity = {
            externalId: workout.id || workout.uuid,
            activityName: mapActivityType(workout.activityName || workout.type || 'Workout'),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            calories: workout.calories ? Math.round(workout.calories) : undefined,
            distance: workout.distance, // Already in meters
            heartRateSamples,
            route: route.length > 0 ? route : undefined,
            source: 'healthkit',
          };

          activities.push(activity);
        } catch (e) {
          console.warn('[AppleHealthService] Failed to process workout:', e);
        }
      }

      console.log(`[AppleHealthService] Processed ${activities.length} activities`);
      resolve(activities);
    });
  });
}

/**
 * Check if HealthKit is available on this device
 */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit !== null;
}

/**
 * Initialize HealthKit with required permissions
 */
export async function initializeHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!AppleHealthKit) {
      resolve(false);
      return;
    }

    const permissions = {
      permissions: {
        read: [
          'Workout',
          'HeartRate',
          'DistanceWalkingRunning',
          'DistanceCycling',
          'ActiveEnergyBurned',
        ],
      },
    };

    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) {
        console.error('[AppleHealthService] Failed to initialize:', err);
        resolve(false);
        return;
      }

      console.log('[AppleHealthService] HealthKit initialized successfully');
      resolve(true);
    });
  });
}

/**
 * Convert queried workouts to the format expected by the sync API
 */
export function convertToSyncPayload(activities: StandardizedActivity[]): {
  activities: StandardizedActivity[];
  device: { platform: 'ios'; osVersion?: string; appVersion?: string };
} {
  return {
    activities,
    device: {
      platform: 'ios',
      osVersion: Platform.Version?.toString(),
    },
  };
}
