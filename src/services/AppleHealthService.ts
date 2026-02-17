/**
 * Apple Health Service
 *
 * iOS HealthKit bridge for querying workouts with heart rate and GPS route data.
 * Uses @kingstinct/react-native-healthkit library for full HealthKit API access
 * including HKWorkoutRouteQuery for GPS route extraction.
 */

import { Platform } from 'react-native';
import type { HeartRateSample, RoutePoint } from '../types/health';

// Conditionally import HealthKit (only works on iOS development builds)
let HealthKit: any = null;

if (Platform.OS === 'ios') {
  try {
    HealthKit = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    console.warn('[AppleHealthService] @kingstinct/react-native-healthkit not available');
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
 * HealthKit workout activity type identifiers
 */
export const WORKOUT_ACTIVITY_TYPES: Record<string, string> = {
  // Cardio
  'HKWorkoutActivityTypeRunning': 'Running',
  'HKWorkoutActivityTypeWalking': 'Walking',
  'HKWorkoutActivityTypeCycling': 'Cycling',
  'HKWorkoutActivityTypeSwimming': 'Swimming',
  'HKWorkoutActivityTypeMixedCardio': 'Cardio',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'HIIT',
  'HKWorkoutActivityTypeJumpRope': 'JumpRope',
  'HKWorkoutActivityTypeDance': 'Dancing',
  // Strength
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'WeightTraining',
  'HKWorkoutActivityTypeCoreTraining': 'CoreTraining',
  'HKWorkoutActivityTypeCrossTraining': 'CrossTraining',
  'HKWorkoutActivityTypeFlexibility': 'Stretching',
  // Equipment
  'HKWorkoutActivityTypeElliptical': 'Elliptical',
  'HKWorkoutActivityTypeRowing': 'Rowing',
  'HKWorkoutActivityTypeStairClimbing': 'StairClimbing',
  // Mind & Body
  'HKWorkoutActivityTypeYoga': 'Yoga',
  'HKWorkoutActivityTypePilates': 'Pilates',
  'HKWorkoutActivityTypeMindAndBody': 'Meditation',
  // Outdoor
  'HKWorkoutActivityTypeHiking': 'Hiking',
  'HKWorkoutActivityTypeSurfingSports': 'Surfing',
  'HKWorkoutActivityTypeSailing': 'Sailing',
  'HKWorkoutActivityTypePaddleSports': 'StandUpPaddling',
  'HKWorkoutActivityTypeClimbing': 'RockClimbing',
  'HKWorkoutActivityTypeEquestrianSports': 'HorsebackRiding',
  // Winter
  'HKWorkoutActivityTypeDownhillSkiing': 'AlpineSki',
  'HKWorkoutActivityTypeCrossCountrySkiing': 'NordicSki',
  'HKWorkoutActivityTypeSnowboarding': 'Snowboarding',
  'HKWorkoutActivityTypeSnowSports': 'Snowboarding',
  'HKWorkoutActivityTypeSkatingSports': 'IceSkating',
  // Racket Sports
  'HKWorkoutActivityTypeTennis': 'Tennis',
  'HKWorkoutActivityTypeTableTennis': 'TableTennis',
  'HKWorkoutActivityTypeBadminton': 'Badminton',
  'HKWorkoutActivityTypeSquash': 'Squash',
  'HKWorkoutActivityTypeRacquetball': 'Racquetball',
  'HKWorkoutActivityTypePickleball': 'Pickleball',
  // Team Sports
  'HKWorkoutActivityTypeSoccer': 'Soccer',
  'HKWorkoutActivityTypeBasketball': 'Basketball',
  'HKWorkoutActivityTypeVolleyball': 'Volleyball',
  'HKWorkoutActivityTypeHandball': 'Handball',
  'HKWorkoutActivityTypeRugby': 'Rugby',
  // Combat
  'HKWorkoutActivityTypeMartialArts': 'MartialArts',
  'HKWorkoutActivityTypeBoxing': 'Boxing',
  // Other
  'HKWorkoutActivityTypeGolf': 'Golf',
  'HKWorkoutActivityTypeGymnastics': 'Gymnastics',
  'HKWorkoutActivityTypeWaterSports': 'Swimming',
  'HKWorkoutActivityTypeWheelchairWalkPace': 'Wheelchair',
  'HKWorkoutActivityTypeWheelchairRunPace': 'Wheelchair',
  'HKWorkoutActivityTypeOther': 'Workout',
};

/**
 * Map HealthKit activity type to readable name
 */
export function mapActivityType(hkType: string): string {
  return WORKOUT_ACTIVITY_TYPES[hkType] || hkType.replace('HKWorkoutActivityType', '');
}

/**
 * Query heart rate samples for a workout time window
 */
async function getHeartRateSamples(
  startDate: Date,
  endDate: Date
): Promise<HeartRateSample[]> {
  if (!HealthKit) return [];

  try {
    const result = await HealthKit.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRate',
      {
        from: startDate,
        to: endDate,
        ascending: true,
      }
    );

    if (!result?.samples) return [];

    return result.samples.map((sample: any) => ({
      timestamp: new Date(sample.startDate),
      bpm: Math.round(sample.quantity),
    }));
  } catch (e) {
    console.warn('[AppleHealthService] Failed to get heart rate samples:', e);
    return [];
  }
}

/**
 * Query GPS route data for a workout using HKWorkoutRouteQuery
 *
 * @kingstinct/react-native-healthkit provides getWorkoutRoutes() which uses
 * the native HKWorkoutRouteQuery to extract CLLocation data (lat, lng,
 * altitude, timestamp) from workout route samples.
 */
async function getWorkoutRoute(workout: any): Promise<RoutePoint[]> {
  if (!HealthKit || !HealthKit.getWorkoutRoutes) return [];

  try {
    const routes = await HealthKit.getWorkoutRoutes(workout);

    if (!routes || routes.length === 0) return [];

    const routePoints: RoutePoint[] = [];

    for (const route of routes) {
      if (route.locations) {
        for (const location of route.locations) {
          routePoints.push({
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            timestamp: new Date(location.timestamp),
          });
        }
      }
    }

    return routePoints;
  } catch (e) {
    console.warn('[AppleHealthService] Failed to get workout route:', e);
    return [];
  }
}

/**
 * Query new workouts since the last sync date
 *
 * Uses queryWorkoutSamples for workout data and getWorkoutRoutes for GPS routes.
 *
 * @param lastSyncDate - Only return workouts after this date
 * @returns Array of standardized activities ready for sync
 */
export async function queryNewWorkouts(
  lastSyncDate: Date
): Promise<StandardizedActivity[]> {
  if (!HealthKit) {
    console.warn('[AppleHealthService] HealthKit not available');
    return [];
  }

  try {
    const endDate = new Date();

    const result = await HealthKit.queryWorkoutSamples({
      from: lastSyncDate,
      to: endDate,
      ascending: true,
    });

    const workouts = result?.samples ?? result;

    if (!workouts || (Array.isArray(workouts) && workouts.length === 0)) {
      return [];
    }

    const workoutArray = Array.isArray(workouts) ? workouts : [workouts];
    console.log(`[AppleHealthService] Found ${workoutArray.length} workouts since ${lastSyncDate.toISOString()}`);

    const activities: StandardizedActivity[] = [];

    for (const workout of workoutArray) {
      try {
        const startTime = new Date(workout.startDate || workout.start);
        const endTime = new Date(workout.endDate || workout.end);
        const duration = workout.duration ||
          (endTime.getTime() - startTime.getTime()) / 1000;

        // Get heart rate samples for this workout window
        const heartRateSamples = await getHeartRateSamples(startTime, endTime);

        // Get GPS route data via HKWorkoutRouteQuery
        const route = await getWorkoutRoute(workout);

        const activity: StandardizedActivity = {
          externalId: workout.uuid || workout.id,
          activityName: mapActivityType(
            workout.workoutActivityType || workout.activityName || workout.type || 'Workout'
          ),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          calories: workout.totalEnergyBurned
            ? Math.round(workout.totalEnergyBurned)
            : undefined,
          distance: workout.totalDistance, // meters
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
    return activities;
  } catch (e) {
    console.error('[AppleHealthService] Failed to query workouts:', e);
    return [];
  }
}

/**
 * Check if HealthKit is available on this device
 */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && HealthKit !== null;
}

/**
 * Check if HealthKit data is available (requires device check)
 */
export async function checkAvailability(): Promise<boolean> {
  if (!HealthKit) return false;

  try {
    return await HealthKit.isHealthDataAvailable();
  } catch (e) {
    console.warn('[AppleHealthService] Failed to check availability:', e);
    return false;
  }
}

/**
 * Initialize HealthKit with required permissions
 *
 * Requests read access to workouts, heart rate, distance, calories,
 * and workout routes (for GPS data).
 */
export async function initializeHealthKit(): Promise<boolean> {
  if (!HealthKit) return false;

  try {
    await HealthKit.requestAuthorization({
      toRead: [
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierDistanceCycling',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKSeriesTypeIdentifierWorkoutRoute',
      ],
    });

    console.log('[AppleHealthService] HealthKit authorization requested successfully');
    return true;
  } catch (e) {
    console.error('[AppleHealthService] Failed to initialize:', e);
    return false;
  }
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
