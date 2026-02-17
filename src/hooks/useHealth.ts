/**
 * FitGlue Health Hook
 * Cross-platform hook for accessing health data from iOS HealthKit and Android Health Connect
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import type { HealthPermissionStatus, WorkoutData, ConnectionStatus } from '../types/health';
import { post, endpoints } from '../config/api';
import { mapExerciseType } from '../services/AndroidHealthService';
import { mapActivityType as mapHKActivityType } from '../services/AppleHealthService';

export type { WorkoutData } from '../types/health';

// Conditionally import platform-specific libraries
// Note: These imports will only work in development builds, not Expo Go
let HealthKitLib: any = null;
let HealthConnect: any = null;

if (Platform.OS === 'ios') {
  try {
    HealthKitLib = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    console.warn('@kingstinct/react-native-healthkit not available. Run on a development build.');
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
  connectionStatus: ConnectionStatus;
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  // Safe wrapper for native module calls — ensures errors are caught
  // even if the native module throws synchronously
  const safeNativeCall = useCallback(async <T>(
    label: string,
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[useHealth] ${label} failed:`, message);
      setError(`${label}: ${message}`);
      return fallback;
    }
  }, []);

  // Initialize health services
  const initialize = useCallback(async (): Promise<boolean> => {
    return safeNativeCall('Initialize', async () => {
      if (Platform.OS === 'ios' && HealthKitLib) {
        const available = await HealthKitLib.isHealthDataAvailable();
        if (!available) {
          setError('HealthKit is not available on this device');
          return false;
        }

        await HealthKitLib.requestAuthorization({
          toRead: [
            'HKWorkoutTypeIdentifier',
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierDistanceWalkingRunning',
            'HKQuantityTypeIdentifierDistanceCycling',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
            'HKSeriesTypeIdentifierWorkoutRoute',
          ],
        });

        setIsAvailable(true);
        setIsInitialized(true);
        return true;
      }

      if (Platform.OS === 'android' && HealthConnect) {
        const initialized = await HealthConnect.initialize();
        setIsAvailable(initialized);
        setIsInitialized(initialized);
        return initialized;
      }

      setError('Health services not available on this platform');
      return false;
    }, false);
  }, [safeNativeCall]);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<HealthPermissionStatus> => {
    return safeNativeCall('Request permissions', async () => {
      if (Platform.OS === 'android' && HealthConnect) {
        const result = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'ExerciseSession' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'TotalCaloriesBurned' },
          { accessType: 'read', recordType: 'Distance' },
        ]);

        // Parse granted permissions
        const newPermissions: HealthPermissionStatus = {
          workouts: result.some((p: any) => p.recordType === 'ExerciseSession'),
          heartRate: result.some((p: any) => p.recordType === 'HeartRate'),
          routes: false, // Routes accessed via requestExerciseRoute() per-session
        };

        setPermissions(newPermissions);

        // Register integration as connected in the backend
        if (newPermissions.workouts) {
          setConnectionStatus('connecting');
          try {
            const result = await post(endpoints.mobileConnect('health-connect'));
            if (result.error) {
              console.error('[useHealth] Failed to register Health Connect:', result.error);
              setConnectionStatus('error');
            } else {
              setConnectionStatus('connected');
            }
          } catch {
            console.error('[useHealth] Network error registering Health Connect');
            setConnectionStatus('error');
          }
        }

        return newPermissions;
      }

      if (Platform.OS === 'ios' && HealthKitLib) {
        const newPermissions: HealthPermissionStatus = {
          workouts: true,
          heartRate: true,
          routes: true,
        };
        setPermissions(newPermissions);

        // Register integration as connected in the backend
        setConnectionStatus('connecting');
        try {
          const result = await post(endpoints.mobileConnect('apple-health'));
          if (result.error) {
            console.error('[useHealth] Failed to register Apple Health:', result.error);
            setConnectionStatus('error');
          } else {
            setConnectionStatus('connected');
          }
        } catch {
          console.error('[useHealth] Network error registering Apple Health');
          setConnectionStatus('error');
        }

        return newPermissions;
      }

      return permissions;
    }, permissions);
  }, [permissions, safeNativeCall]);

  // Get workouts
  const getWorkouts = useCallback(
    async (startDate: Date, endDate: Date): Promise<WorkoutData[]> => {
      return safeNativeCall('Get workouts', async () => {
        if (Platform.OS === 'ios' && HealthKitLib) {
          const result = await HealthKitLib.queryWorkoutSamples({
            from: startDate,
            to: endDate,
            ascending: false,
          });

          const samples = result?.samples ?? result;
          const workoutArray = Array.isArray(samples) ? samples : samples ? [samples] : [];

          const workouts: WorkoutData[] = workoutArray.map((w: any) => ({
            id: w.uuid || w.id || String(Date.now()),
            type: mapHKActivityType(w.workoutActivityType || w.activityName || 'Workout'),
            startDate: new Date(w.startDate || w.start),
            endDate: new Date(w.endDate || w.end),
            duration: w.duration || 0,
            distance: w.totalDistance,
            calories: w.totalEnergyBurned ? Math.round(w.totalEnergyBurned) : undefined,
            source: 'healthkit',
          }));

          // Ensure reverse-chronological order
          return workouts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        }

        if (Platform.OS === 'android' && HealthConnect) {
          const result = await HealthConnect.readRecords('ExerciseSession', {
            timeRangeFilter: {
              operator: 'between',
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
            },
          });

          const workouts: WorkoutData[] = (result?.records ?? []).map((w: any) => ({
            id: w.metadata?.id || String(Date.now()),
            type: mapExerciseType(w.exerciseType ?? 0),
            startDate: new Date(w.startTime),
            endDate: new Date(w.endTime),
            duration: (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000,
            source: 'health_connect',
          }));

          // Ensure reverse-chronological order
          return workouts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        }

        return [];
      }, []);
    },
    [safeNativeCall]
  );

  // Check availability on mount
  useEffect(() => {
    if (Platform.OS === 'ios') {
      setIsAvailable(HealthKitLib != null);
    } else if (Platform.OS === 'android') {
      setIsAvailable(HealthConnect != null);
    }
  }, []);

  return {
    isAvailable,
    isInitialized,
    permissions,
    connectionStatus,
    error,
    initialize,
    requestPermissions,
    getWorkouts,
  };
}
