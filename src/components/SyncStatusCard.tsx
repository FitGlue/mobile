/**
 * Sync Status Card Component — Brutal × Aurora
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
import { colors, gradients, spacing } from '../theme';

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
            {/* Band header */}
            <View style={styles.bandHeader}>
                <Text style={styles.bandTitle}>📡 SYNC STATUS</Text>
                <Text style={styles.bandRight}>
                    {syncStatus === 'syncing' ? 'RUNNING' : syncStatus === 'success' ? 'OK' : syncStatus === 'error' ? 'FAILED' : 'IDLE'}
                </Text>
            </View>

            <View style={styles.body}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>LAST SYNC</Text>
                    <Text style={styles.statusValue}>
                        {lastSync ? lastSync.toLocaleString() : 'NEVER'}
                    </Text>
                </View>

                {/* Sync result banner */}
                {syncStatus === 'syncing' && (
                    <View style={styles.bannerRunning}>
                        <ActivityIndicator size="small" color={colors.violet} />
                        <Text style={styles.bannerTextRunning}>SYNCING WORKOUTS TO FITGLUE…</Text>
                    </View>
                )}
                {syncStatus === 'success' && lastSyncResult && (
                    <View style={styles.bannerSuccess}>
                        <Text style={styles.bannerTextSuccess}>
                            ✓ SYNCED — {lastSyncResult.processedCount} WORKOUT{lastSyncResult.processedCount !== 1 ? 'S' : ''} PROCESSED
                        </Text>
                    </View>
                )}
                {syncStatus === 'error' && lastSyncResult && (
                    <View style={styles.bannerError}>
                        <Text style={styles.bannerTextError}>
                            {(lastSyncResult.error || 'SYNC FAILED').toUpperCase()}
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
                            {syncStatus === 'syncing' ? 'SYNCING…' : 'SYNC NOW →'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Browse device workouts */}
                <TouchableOpacity
                    style={[styles.outlineButton, loading && styles.buttonDisabled]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onFetchWorkouts();
                    }}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>
                        {loading ? 'FETCHING…' : 'BROWSE DEVICE WORKOUTS — LAST 30 DAYS →'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.ink2,
        marginBottom: spacing.lg,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    bandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.ink,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    bandTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bandRight: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    body: {
        padding: spacing.lg,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    statusLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    statusValue: {
        fontSize: 11,
        color: colors.textPrimary,
        fontFamily: 'monospace',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    bannerRunning: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.violet,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: 10,
    },
    bannerTextRunning: {
        color: colors.violet,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        flex: 1,
    },
    bannerSuccess: {
        borderWidth: 1,
        borderColor: colors.cyan,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    bannerTextSuccess: {
        color: colors.cyan,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    bannerError: {
        borderWidth: 1,
        borderColor: colors.rose,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    bannerTextError: {
        color: colors.rose,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    buttonWrapper: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.ink,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    outlineButton: {
        borderWidth: 1.5,
        borderColor: colors.paper,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    outlineButtonText: {
        color: colors.paper,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
