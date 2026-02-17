/**
 * FitGlue Health Data Types
 * Type definitions for health data from iOS HealthKit and Android Health Connect
 */

// Permission types for both platforms
export type HealthPermissionType = 'Workouts' | 'HeartRate' | 'Routes';

export interface HealthPermissionStatus {
  workouts: boolean;
  heartRate: boolean;
  routes: boolean;
}

// Connection registration status with backend
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

// Workout data structure (normalized across platforms)
export interface WorkoutData {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in seconds
  distance?: number; // in meters
  calories?: number;
  heartRateSamples?: HeartRateSample[];
  route?: RoutePoint[];
  source: 'healthkit' | 'health_connect';
}

export interface HeartRateSample {
  timestamp: Date;
  bpm: number;
}

export interface RoutePoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude?: number;
}

// iOS HealthKit specific types
export namespace HealthKit {
  export interface AppleHealthKitOptions {
    permissions: {
      read: string[];
      write?: string[];
    };
  }

  // HealthKit permission identifiers
  export const Permissions = {
    Workouts: 'Workout',
    HeartRate: 'HeartRate',
    DistanceWalkingRunning: 'DistanceWalkingRunning',
    DistanceCycling: 'DistanceCycling',
    ActiveEnergyBurned: 'ActiveEnergyBurned',
  } as const;
}

// Android Health Connect specific types
export namespace HealthConnect {
  export interface PermissionRequest {
    accessType: 'read' | 'write';
    recordType: string;
  }

  // Health Connect record types
  export const RecordTypes = {
    Exercise: 'ExerciseSession',
    HeartRate: 'HeartRate',
    ExerciseRoute: 'ExerciseRoute',
  } as const;

  // Health Connect permission strings
  export const Permissions = {
    ReadExercise: 'android.permission.health.READ_EXERCISE',
    ReadHeartRate: 'android.permission.health.READ_HEART_RATE',
    ReadExerciseRoute: 'android.permission.health.READ_EXERCISE_ROUTE',
  } as const;
}
