/**
 * FitGlue Health Hook
 * Cross-platform hook for accessing health data from iOS HealthKit and Android Health Connect
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import type { HealthPermissionStatus, WorkoutData } from '../types/health';

// Conditionally import platform-specific libraries
// Note: These imports will only work in development builds, not Expo Go
let AppleHealthKit: any = null;
let HealthConnect: any = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('react-native-health not available. Run on a development build.');
  }
}

if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch (e) {
    console.warn('react-native-health-connect not available. Run on a development build.');
  }
}

export interface UseHealthResult {
  isAvailable: boolean;
  isInitialized: boolean;
  permissions: HealthPermissionStatus;
  error: string | null;
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<HealthPermissionStatus>;
  getWorkouts: (startDate: Date, endDate: Date) => Promise<WorkoutData[]>;
}

export function useHealth(): UseHealthResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissions, setPermissions] = useState<HealthPermissionStatus>({
    workouts: false,
    heartRate: false,
    routes: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize health services
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios' && AppleHealthKit) {
        return new Promise((resolve, reject) => {
          const options = {
            permissions: {
              read: [
                'Workout',
                'HeartRate',
                'DistanceWalkingRunning',
                'DistanceCycling',
              ],
            },
          };

          AppleHealthKit.initHealthKit(options, (err: any) => {
            if (err) {
              setError(`HealthKit initialization failed: ${err.message}`);
              reject(err);
              return;
            }
            setIsAvailable(true);
            setIsInitialized(true);
            resolve(true);
          });
        });
      }

      if (Platform.OS === 'android' && HealthConnect) {
        const initialized = await HealthConnect.initialize();
        setIsAvailable(initialized);
        setIsInitialized(initialized);
        return initialized;
      }

      setError('Health services not available on this platform');
      return false;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Initialization failed: ${message}`);
      return false;
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<HealthPermissionStatus> => {
    try {
      if (Platform.OS === 'android' && HealthConnect) {
        const result = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'ExerciseSession' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'ExerciseRoute' },
        ]);

        // Parse granted permissions
        const newPermissions: HealthPermissionStatus = {
          workouts: result.some((p: any) => p.recordType === 'ExerciseSession'),
          heartRate: result.some((p: any) => p.recordType === 'HeartRate'),
          routes: result.some((p: any) => p.recordType === 'ExerciseRoute'),
        };

        setPermissions(newPermissions);
        return newPermissions;
      }

      if (Platform.OS === 'ios' && AppleHealthKit) {
        // On iOS, permissions are requested during initialization
        // This returns the current status
        const newPermissions: HealthPermissionStatus = {
          workouts: true, // Requested during init
          heartRate: true,
          routes: false, // iOS handles routes differently via workout routes
        };
        setPermissions(newPermissions);
        return newPermissions;
      }

      return permissions;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Permission request failed: ${message}`);
      return permissions;
    }
  }, [permissions]);

  // Get workouts
  const getWorkouts = useCallback(
    async (startDate: Date, endDate: Date): Promise<WorkoutData[]> => {
      try {
        if (Platform.OS === 'ios' && AppleHealthKit) {
          return new Promise((resolve, reject) => {
            AppleHealthKit.getSamples(
              {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                type: 'Workout',
              },
              (err: any, results: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                const workouts: WorkoutData[] = results.map((w) => ({
                  id: w.id || String(Date.now()),
                  type: w.activityName || 'Unknown',
                  startDate: new Date(w.start),
                  endDate: new Date(w.end),
                  duration: w.duration || 0,
                  distance: w.distance,
                  calories: w.calories,
                  source: 'healthkit',
                }));

                resolve(workouts);
              }
            );
          });
        }

        if (Platform.OS === 'android' && HealthConnect) {
          const result = await HealthConnect.readRecords('ExerciseSession', {
            timeRangeFilter: {
              operator: 'between',
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
            },
          });

          const workouts: WorkoutData[] = result.records.map((w: any) => ({
            id: w.metadata?.id || String(Date.now()),
            type: w.exerciseType || 'Unknown',
            startDate: new Date(w.startTime),
            endDate: new Date(w.endTime),
            duration: (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000,
            source: 'health_connect',
          }));

          return workouts;
        }

        return [];
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(`Failed to get workouts: ${message}`);
        return [];
      }
    },
    []
  );

  // Check availability on mount
  useEffect(() => {
    if (Platform.OS === 'ios') {
      setIsAvailable(AppleHealthKit != null);
    } else if (Platform.OS === 'android') {
      setIsAvailable(HealthConnect != null);
    }
  }, []);

  return {
    isAvailable,
    isInitialized,
    permissions,
    error,
    initialize,
    requestPermissions,
    getWorkouts,
  };
}
