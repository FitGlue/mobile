/**
 * FitGlue Mobile Home Screen
 *
 * Main dashboard for authenticated users.
 * Orchestrates health sync status, recent workouts, and dashboard link.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useHealth, WorkoutData } from '../hooks/useHealth';
import { environment } from '../config/environment';
import * as StorageService from '../services/StorageService';
import { triggerManualSync } from '../services/BackgroundSyncTask';
import { submitActivities, fetchRemoteSyncedIds } from '../services/SyncService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { formatRelativeTime } from '../utils/formatters';
import { colors, spacing, radii } from '../theme';

// Components
import { DashboardHeader } from '../components/DashboardHeader';
import { HealthStatusCard } from '../components/HealthStatusCard';
import { SyncStatusCard, SyncStatus, SyncResultInfo } from '../components/SyncStatusCard';
import { WorkoutList } from '../components/WorkoutList';
import { DashboardLink } from '../components/DashboardLink';
import { EmptyWorkoutState } from '../components/EmptyWorkoutState';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export function HomeScreen({ navigation }: HomeScreenProps): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    isAvailable,
    isInitialized,
    permissions,
    connectionStatus,
    error: healthError,
    initialize,
    requestPermissions,
    getWorkouts,
  } = useHealth();

  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResultInfo | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const syncDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load last sync date, persisted synced IDs, and cached workouts on mount
  useEffect(() => {
    StorageService.getLastSyncDate().then(setLastSync);
    StorageService.getSyncedIds().then(setSyncedIds);
    StorageService.getCachedWorkouts().then((cached) => {
      if (cached.length > 0) {
        setWorkouts(cached);
      }
    });
  }, []);

  // Clean up auto-dismiss timer
  useEffect(() => {
    return () => {
      if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
    };
  }, []);

  const handleSyncNow = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncStatus('syncing');
    setLastSyncResult(null);
    if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);

    try {
      const result = await triggerManualSync();
      setLastSyncResult(result);
      if (result.success) {
        setSyncStatus('success');
        setLastSync(new Date());
        syncDismissTimer.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 5000);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
      setLastSyncResult({ success: false, processedCount: 0, error: 'Sync failed unexpectedly' });
    }
  }, []);

  const handleInitializeHealth = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      setVisibleCount(10);
      setLastSync(new Date());

      // Cache workouts for instant display on next mount
      StorageService.setCachedWorkouts(data);

      // Seed synced IDs from backend if local storage is empty
      // (handles reinstall / storage clear)
      const localIds = await StorageService.getSyncedIds();
      if (localIds.size === 0 && data.length > 0) {
        try {
          const remoteIds = await fetchRemoteSyncedIds();
          const deviceIds = new Set(data.map(w => w.id));
          const intersection = remoteIds.filter(id => deviceIds.has(id));
          if (intersection.length > 0) {
            const seeded = new Set(intersection);
            setSyncedIds(seeded);
            for (const id of intersection) {
              await StorageService.addSyncedId(id);
            }
          }
        } catch {
          // Non-fatal — local-only badges still work
        }
      }
    } catch (err) {
      console.error('[HomeScreen] Fetch workouts failed:', err);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, getWorkouts]);

  const handleSyncWorkout = useCallback(async (workout: WorkoutData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncingId(workout.id);
    try {
      const result = await submitActivities([workout]);
      if (result.success) {
        setSyncedIds((prev) => new Set(prev).add(workout.id));
        await StorageService.addSyncedId(workout.id);
      } else {
        Alert.alert('Sync Failed', result.error || 'Could not sync this workout.');
      }
    } catch {
      Alert.alert('Sync Failed', 'An unexpected error occurred.');
    } finally {
      setSyncingId(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await handleFetchWorkouts();
    setRefreshing(false);
  }, [handleFetchWorkouts]);

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <DashboardHeader
        userInitial={userInitial}
        onOpenSettings={() => navigation.navigate('Settings')}
        topInset={insets.top}
      />

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
            tintColor={colors.primary}
          />
        }
      >
        {/* Dashboard Title */}
        <Text style={styles.dashboardTitle}>Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Here's what's happening with your fitness data.</Text>

        {/* Last Sync Status */}
        <View style={styles.syncBanner}>
          <View style={[styles.syncDot, lastSync ? styles.dotGreen : styles.dotAmber]} />
          <Text style={styles.syncBannerText}>
            Last sync: {formatRelativeTime(lastSync)}
          </Text>
        </View>

        {/* Health Status */}
        <HealthStatusCard
          isAvailable={isAvailable}
          isInitialized={isInitialized}
          permissions={permissions}
          connectionStatus={connectionStatus}
          healthError={healthError}
          loading={loading}
          onInitialize={handleInitializeHealth}
        />

        {/* Sync Status */}
        {isInitialized && (
          <SyncStatusCard
            lastSync={lastSync}
            syncStatus={syncStatus}
            lastSyncResult={lastSyncResult}
            loading={loading}
            onSyncNow={handleSyncNow}
            onFetchWorkouts={handleFetchWorkouts}
          />
        )}

        {/* Device Workouts */}
        {isInitialized && workouts.length === 0 && !loading && (
          <EmptyWorkoutState />
        )}
        <WorkoutList
          workouts={workouts}
          visibleCount={visibleCount}
          syncedIds={syncedIds}
          syncingId={syncingId}
          onSyncWorkout={handleSyncWorkout}
          onShowMore={() => setVisibleCount(prev => prev + 10)}
        />

        {/* Dashboard Link */}
        <DashboardLink />

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
    backgroundColor: colors.background,
  },
  envBadge: {
    alignSelf: 'center',
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.xl,
    marginTop: spacing.md,
  },
  envBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dashboardSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: colors.success,
  },
  dotAmber: {
    backgroundColor: colors.warning,
  },
  syncBannerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
