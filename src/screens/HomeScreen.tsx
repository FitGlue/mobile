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
import { LinearGradient } from 'expo-linear-gradient';
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

  // Get initials from email
  const userInitial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.titleFit}>Fit</Text>
            <Text style={styles.titleGlue}>Glue</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <LinearGradient
            colors={['#FF006E', '#8338EC']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

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
            tintColor="#FF006E"
          />
        }
      >
        {/* Dashboard Title */}
        <Text style={styles.dashboardTitle}>Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Here's what's happening with your fitness data.</Text>

        {/* Health Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🏥 {platformName}
          </Text>
          <Text style={styles.cardDescription}>
            {isInitialized
              ? 'Your health data is connected and ready to sync.'
              : `Connect to ${platformName} to start syncing your workouts.`}
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Available</Text>
            <View style={[styles.statusDot, isAvailable ? styles.dotGreen : styles.dotRed]} />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Initialized</Text>
            <View style={[styles.statusDot, isInitialized ? styles.dotGreen : styles.dotRed]} />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Workouts</Text>
            {permissions.workouts ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : (
              <View style={styles.emptyCircle} />
            )}
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Heart Rate</Text>
            {permissions.heartRate ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : (
              <View style={styles.emptyCircle} />
            )}
          </View>

          {healthError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{healthError}</Text>
            </View>
          )}

          {!isInitialized && (
            <TouchableOpacity
              style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
              onPress={handleInitializeHealth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF006E', '#8338EC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Connecting...' : `Connect to ${platformName}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Sync Card */}
        {isInitialized && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📡 Sync Status</Text>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync</Text>
              <Text style={styles.statusValue}>
                {lastSync ? lastSync.toLocaleString() : 'Never'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Workouts Found</Text>
              <Text style={styles.statusValue}>{workouts.length}</Text>
            </View>

            <TouchableOpacity
              style={[styles.outlineButton, loading && styles.buttonDisabled]}
              onPress={handleFetchWorkouts}
              disabled={loading}
            >
              <Text style={styles.outlineButtonText}>
                {loading ? 'Fetching...' : 'Fetch Workouts (Last 30 Days)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Workouts List */}
        {workouts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏋️ Recent Workouts</Text>

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
            {isInitialized
              ? '✨ Your workouts are being synced and enhanced automatically.'
              : '📱 Connect a health source above to get started.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
  },
  titleFit: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF006E',
  },
  titleGlue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8338EC',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  envBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 110, 0.15)',
    borderWidth: 1,
    borderColor: '#FF006E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  envBadgeText: {
    color: '#FF006E',
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
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  dashboardSubtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 15,
    color: '#aaa',
  },
  statusValue: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  checkmark: {
    color: '#14b8a6',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#555',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  buttonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#FF006E',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  outlineButtonText: {
    color: '#FF006E',
    fontSize: 15,
    fontWeight: '600',
  },
  workoutItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workoutType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF006E',
  },
  workoutDate: {
    fontSize: 13,
    color: '#888',
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutStat: {
    fontSize: 13,
    color: '#ccc',
  },
  moreWorkouts: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginBottom: 4,
  },
});
