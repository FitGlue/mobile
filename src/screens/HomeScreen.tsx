/**
 * FitGlue Mobile Home Screen
 *
 * Main dashboard for authenticated users.
 * Shows health sync status and recent activity.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useHealth, WorkoutData } from '../hooks/useHealth';
import { environment } from '../config/environment';

export function HomeScreen(): JSX.Element {
  const { user, signOut } = useAuth();
  const {
    isAvailable,
    isInitialized,
    permissions,
    error: healthError,
    initialize,
    requestPermissions,
    getWorkouts,
  } = useHealth();

  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleInitializeHealth = useCallback(async () => {
    setLoading(true);
    try {
      const success = await initialize();
      if (success) {
        await requestPermissions();
      }
    } catch (err) {
      console.error('[HomeScreen] Health init failed:', err);
    } finally {
      setLoading(false);
    }
  }, [initialize, requestPermissions]);

  const handleFetchWorkouts = useCallback(async () => {
    if (!isInitialized) {
      Alert.alert('Not Ready', 'Please initialize health services first.');
      return;
    }

    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const data = await getWorkouts(startDate, endDate);
      setWorkouts(data);
      setLastSync(new Date());
    } catch (err) {
      console.error('[HomeScreen] Fetch workouts failed:', err);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, getWorkouts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await handleFetchWorkouts();
    setRefreshing(false);
  }, [handleFetchWorkouts]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  }, [signOut]);

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Environment Badge */}
      {environment !== 'production' && (
        <View style={styles.envBadge}>
          <Text style={styles.envBadgeText}>{environment.toUpperCase()}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Health Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{platformName} Status</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Available:</Text>
            <Text style={[styles.statusValue, isAvailable ? styles.statusGreen : styles.statusRed]}>
              {isAvailable ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Initialized:</Text>
            <Text style={[styles.statusValue, isInitialized ? styles.statusGreen : styles.statusRed]}>
              {isInitialized ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Workouts:</Text>
            <Text style={[styles.statusValue, permissions.workouts ? styles.statusGreen : styles.statusRed]}>
              {permissions.workouts ? 'Granted' : 'Not Granted'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Heart Rate:</Text>
            <Text style={[styles.statusValue, permissions.heartRate ? styles.statusGreen : styles.statusRed]}>
              {permissions.heartRate ? 'Granted' : 'Not Granted'}
            </Text>
          </View>

          {healthError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{healthError}</Text>
            </View>
          )}

          {!isInitialized && (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleInitializeHealth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Connecting...' : `Connect to ${platformName}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sync Card */}
        {isInitialized && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sync Status</Text>

            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Last Sync:</Text>
              <Text style={styles.syncValue}>
                {lastSync ? lastSync.toLocaleString() : 'Never'}
              </Text>
            </View>

            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Workouts Found:</Text>
              <Text style={styles.syncValue}>{workouts.length}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
              onPress={handleFetchWorkouts}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Fetching...' : 'Fetch Workouts (Last 30 Days)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Workouts List */}
        {workouts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Workouts</Text>

            {workouts.slice(0, 10).map((workout, index) => (
              <View key={workout.id || index} style={styles.workoutItem}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutType}>{workout.type}</Text>
                  <Text style={styles.workoutDate}>
                    {workout.startDate.toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStat}>
                    ⏱️ {Math.round(workout.duration / 60)} min
                  </Text>
                  {workout.distance && (
                    <Text style={styles.workoutStat}>
                      📍 {(workout.distance / 1000).toFixed(2)} km
                    </Text>
                  )}
                  {workout.calories && (
                    <Text style={styles.workoutStat}>
                      🔥 {workout.calories} cal
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {workouts.length > 10 && (
              <Text style={styles.moreWorkouts}>
                +{workouts.length - 10} more workouts
              </Text>
            )}
          </View>
        )}

        {/* Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            📡 Background sync is {isInitialized ? 'enabled' : 'disabled'}.
          </Text>
          <Text style={styles.footerText}>
            Health features require a development build.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  greeting: {
    fontSize: 14,
    color: '#94a3b8',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  envBadge: {
    alignSelf: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  envBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusGreen: {
    color: '#22c55e',
  },
  statusRed: {
    color: '#ef4444',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonSecondary: {
    backgroundColor: '#0d9488',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  syncLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  syncValue: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  workoutItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workoutType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#14b8a6',
  },
  workoutDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutStat: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  moreWorkouts: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
});
