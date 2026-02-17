/**
 * Sync Status Card Component
 *
 * Shows sync state, sync result banners, Sync Now button,
 * and the Browse Device Workouts button.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, gradients, spacing, radii } from '../theme';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResultInfo {
    success: boolean;
    processedCount: number;
    error?: string;
}

interface SyncStatusCardProps {
    lastSync: Date | null;
    syncStatus: SyncStatus;
    lastSyncResult: SyncResultInfo | null;
    loading: boolean;
    onSyncNow: () => void;
    onFetchWorkouts: () => void;
}

export function SyncStatusCard({
    lastSync,
    syncStatus,
    lastSyncResult,
    loading,
    onSyncNow,
    onFetchWorkouts,
}: SyncStatusCardProps): JSX.Element {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📡 Sync Status</Text>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Sync</Text>
                <Text style={styles.statusValue}>
                    {lastSync ? lastSync.toLocaleString() : 'Never'}
                </Text>
            </View>

            {/* Sync result banner */}
            {syncStatus === 'syncing' && (
                <View style={styles.syncResultBanner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.syncResultText}>Syncing workouts to FitGlue…</Text>
                </View>
            )}
            {syncStatus === 'success' && lastSyncResult && (
                <View style={[styles.syncResultBanner, styles.syncResultSuccess]}>
                    <Text style={styles.successIcon}>✓</Text>
                    <Text style={styles.syncResultTextSuccess}>
                        Synced! {lastSyncResult.processedCount} workout{lastSyncResult.processedCount !== 1 ? 's' : ''} processed.
                    </Text>
                </View>
            )}
            {syncStatus === 'error' && lastSyncResult && (
                <View style={[styles.syncResultBanner, styles.syncResultError]}>
                    <Text style={styles.syncResultTextError}>
                        {lastSyncResult.error || 'Sync failed'}
                    </Text>
                </View>
            )}

            {/* Sync Now button */}
            <TouchableOpacity
                style={[styles.buttonWrapper, syncStatus === 'syncing' && styles.buttonDisabled]}
                onPress={onSyncNow}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                >
                    <Text style={styles.buttonText}>
                        {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Now'}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Fetch workouts locally */}
            <TouchableOpacity
                style={[styles.outlineButton, loading && styles.buttonDisabled]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onFetchWorkouts();
                }}
                disabled={loading}
            >
                <Text style={styles.outlineButtonText}>
                    {loading ? 'Fetching…' : 'Browse Device Workouts (Last 30 Days)'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    statusValue: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    syncResultBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primarySurfaceLight,
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: 10,
    },
    syncResultSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    syncResultError: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    syncResultText: {
        color: colors.primary,
        fontSize: 13,
        flex: 1,
    },
    syncResultTextSuccess: {
        color: colors.success,
        fontSize: 13,
        flex: 1,
    },
    syncResultTextError: {
        color: colors.error,
        fontSize: 13,
        flex: 1,
    },
    successIcon: {
        color: colors.success,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonWrapper: {
        borderRadius: radii.lg,
        overflow: 'hidden',
        marginTop: spacing.md,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: radii.lg,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 14,
        borderRadius: radii.lg,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    outlineButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
});
