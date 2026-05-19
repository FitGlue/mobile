/**
 * FitGlue Mobile Home Screen — Brutal × Aurora
 *
 * Dashboard: greeting hero, 2×2 stat grid, sync status, recent workouts.
 * Matches the BA mobile dashboard archetype.
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
import { colors, spacing } from '../theme';

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

      StorageService.setCachedWorkouts(data);

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
          // Non-fatal
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

  // Derive greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <DashboardHeader
        userInitial={userInitial}
        onOpenSettings={() => navigation.navigate('Settings')}
        topInset={insets.top}
      />

      {/* Environment badge */}
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
            tintColor={colors.violet}
          />
        }
      >
        {/* Hero greeting */}
        <View style={styles.hero}>
          <Text style={styles.heroWhen}>
            {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
          </Text>
          <Text style={styles.heroTitle}>{greeting} —{'\n'}WELCOME BACK.</Text>
        </View>

        {/* 2×2 stat grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCell, styles.statCellRight, styles.statCellBottom]}>
            <Text style={styles.statNumber}>{workouts.length}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBottom]}>
            <Text style={styles.statNumber}>{syncedIds.size}</Text>
            <Text style={styles.statLabel}>SYNCED</Text>
          </View>
          <View style={[styles.statCell, styles.statCellRight, styles.statCellGradient]}>
            <Text style={styles.statNumberGradient}>
              {isInitialized ? 'ON' : 'OFF'}
            </Text>
            <Text style={styles.statLabel}>HEALTH</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>{formatRelativeTime(lastSync) === 'Never' ? '—' : '✓'}</Text>
            <Text style={styles.statLabel}>LAST SYNC</Text>
          </View>
        </View>

        {/* Sync status line */}
        <View style={styles.syncLine}>
          <View style={[styles.syncDot, lastSync ? styles.dotCyan : styles.dotAmber]} />
          <Text style={styles.syncLineText}>
            {formatRelativeTime(lastSync)}
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

        {/* Dashboard CTA */}
        <DashboardLink />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isInitialized
              ? '✨ YOUR WORKOUTS ARE SYNCED AND ENHANCED AUTOMATICALLY.'
              : '📱 CONNECT A HEALTH SOURCE ABOVE TO GET STARTED.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  envBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: colors.violet,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  envBadgeText: {
    color: colors.violet,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Hero greeting
  hero: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  heroWhen: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.paper,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  // 2×2 stat grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.ink2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  statCell: {
    width: '50%',
    padding: spacing.lg,
  },
  statCellRight: {
    borderRightWidth: 1.5,
    borderRightColor: colors.hairline,
  },
  statCellBottom: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  statCellGradient: {
    // The gradient number cell
  },
  statNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.paper,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statNumberGradient: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.cyan,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // Sync status line
  syncLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
    gap: spacing.sm,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCyan: {
    backgroundColor: colors.cyan,
  },
  dotAmber: {
    backgroundColor: colors.warning,
  },
  syncLineText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSubtle,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
