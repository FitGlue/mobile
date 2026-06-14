import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useHealth } from '../hooks/useHealth';
import * as StorageService from '../services/StorageService';
import {
  isBackgroundSyncRegistered,
  registerBackgroundSync,
  unregisterBackgroundSync,
  triggerManualSync,
} from '../services/BackgroundSyncTask';
import { get, endpoints } from '../config/api';
import { formatRelativeTime } from '../utils/formatters';
import { colors, spacing } from '../theme';
import { HealthStatusCard } from '../components/HealthStatusCard';
import { SyncStatusCard, SyncStatus, SyncResultInfo } from '../components/SyncStatusCard';

interface Activity {
  id: string;
  name: string;
  type: string;
  startedAt: string;
  durationSeconds?: number;
}

interface SyncScreenProps {
  onNavigate: (path: string) => void;
}

export function SyncScreen({ onNavigate }: SyncScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const {
    isAvailable,
    isInitialized,
    permissions,
    connectionStatus,
    error: healthError,
    initialize,
    requestPermissions,
  } = useHealth();

  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [bgSyncRegistered, setBgSyncRegistered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResultInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const res = await get<{ activities: Activity[] }>(`${endpoints.activities}?limit=5&page=1`);
      if (res.data?.activities) setRecentActivities(res.data.activities);
    } catch { /* non-fatal */ } finally {
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [date, enabled, registered] = await Promise.all([
        StorageService.getLastSyncDate(),
        StorageService.isSyncEnabled(),
        isBackgroundSyncRegistered(),
      ]);
      setLastSync(date);
      setSyncEnabled(enabled);
      setBgSyncRegistered(registered);
    })();
    fetchRecentActivities();
  }, [fetchRecentActivities]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [date, enabled, registered] = await Promise.all([
          StorageService.getLastSyncDate(),
          StorageService.isSyncEnabled(),
          isBackgroundSyncRegistered(),
        ]);
        setLastSync(date);
        setSyncEnabled(enabled);
        setBgSyncRegistered(registered);
      })();
      fetchRecentActivities();
    }, [fetchRecentActivities])
  );

  const handleInitializeHealth = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const success = await initialize();
      if (success) await requestPermissions();
    } catch (err) {
      console.error('[SyncScreen] Health init failed:', err);
    } finally {
      setLoading(false);
    }
  }, [initialize, requestPermissions]);

  const handleSyncNow = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncResult(null);
    try {
      const result = await triggerManualSync();
      setLastSyncResult(result);
      setSyncStatus(result.success ? 'success' : 'error');
      if (result.success) { setLastSync(new Date()); fetchRecentActivities(); }
    } catch {
      setSyncStatus('error');
      setLastSyncResult({ success: false, processedCount: 0, error: 'Sync failed unexpectedly' });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleToggleSync = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncEnabled(value);
    await StorageService.setSyncEnabled(value);
    if (value) {
      await registerBackgroundSync();
      setBgSyncRegistered(true);
    } else {
      await unregisterBackgroundSync();
      setBgSyncRegistered(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { /* handled by AuthContext */ } },
    ]);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SYNC</Text>
        <Text style={styles.headerTitle}>HEALTH SYNC</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Last sync banner */}
        <View style={styles.syncBanner}>
          <View style={[styles.syncDot, lastSync ? styles.dotCyan : styles.dotAmber]} />
          <Text style={styles.syncBannerText}>
            LAST SYNC: {formatRelativeTime(lastSync).toUpperCase()}
          </Text>
        </View>

        {/* Health connection status */}
        <HealthStatusCard
          isAvailable={isAvailable}
          isInitialized={isInitialized}
          permissions={permissions}
          connectionStatus={connectionStatus}
          healthError={healthError}
          loading={loading}
          onInitialize={handleInitializeHealth}
        />

        {/* Sync controls */}
        {isInitialized && (
          <SyncStatusCard
            lastSync={lastSync}
            syncStatus={syncStatus}
            lastSyncResult={lastSyncResult}
            loading={isSyncing}
            onSyncNow={handleSyncNow}
            onFetchWorkouts={handleSyncNow}
          />
        )}

        {/* Auto-sync toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BACKGROUND SYNC</Text>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>AUTO SYNC</Text>
              <Text style={styles.rowSubtitle}>
                {bgSyncRegistered ? 'SYNCS AUTOMATICALLY IN BACKGROUND' : 'MANUAL SYNC ONLY'}
              </Text>
            </View>
            <Switch
              value={syncEnabled}
              onValueChange={handleToggleSync}
              trackColor={{ false: colors.ink3, true: colors.primaryTrack }}
              thumbColor={syncEnabled ? colors.pink : colors.textMuted}
            />
          </View>
        </View>

        {/* Background sync OS status */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STATUS</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, bgSyncRegistered ? styles.dotCyan : styles.dotAmber]} />
            <Text style={styles.statusText}>
              {bgSyncRegistered ? 'BACKGROUND SYNC REGISTERED WITH OS' : 'BACKGROUND SYNC NOT REGISTERED'}
            </Text>
          </View>
        </View>

        {/* Recently synced activities from FitGlue */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>RECENTLY SYNCED</Text>
            <TouchableOpacity onPress={fetchRecentActivities} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>↺ REFRESH</Text>
            </TouchableOpacity>
          </View>
          {activitiesLoading ? (
            <View style={styles.row}>
              <Text style={styles.rowSubtitle}>LOADING...</Text>
            </View>
          ) : recentActivities.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowSubtitle}>NO ACTIVITIES SYNCED YET</Text>
            </View>
          ) : (
            recentActivities.map((act) => (
              <View key={act.id} style={styles.activityRow}>
                <View style={styles.activityType}>
                  <Text style={styles.activityTypeText}>{act.type?.substring(0, 3).toUpperCase() ?? '---'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>{act.name}</Text>
                  <Text style={styles.activityMeta}>
                    {act.startedAt ? new Date(act.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                    {act.durationSeconds ? `  ·  ${Math.round(act.durationSeconds / 60)}MIN` : ''}
                  </Text>
                </View>
                <View style={[styles.syncDot, styles.dotCyan]} />
              </View>
            ))
          )}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.paper,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  syncBanner: {
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
  dotCyan: { backgroundColor: colors.cyan },
  dotAmber: { backgroundColor: colors.warning },
  syncBannerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: spacing.lg,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.paper,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowSubtitle: {
    fontSize: 9,
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.ink2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  refreshBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  refreshBtnText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.pink,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: spacing.sm,
  },
  activityType: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTypeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.paper,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activityMeta: {
    fontSize: 9,
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
