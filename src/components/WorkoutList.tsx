/**
 * Workout List Component — Brutal × Aurora
 *
 * Displays device workouts with per-item sync buttons,
 * sync status indicators, data-type pills, and show-more pagination.
 * Tapping a workout navigates to the full WorkoutDetail screen.
 *
 * Design: stacked run rows with hairline dividers (BA dashboard pattern).
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../theme';
import { WorkoutData } from '../hooks/useHealth';
import { formatDuration, formatDistance, pluralise } from '../utils/formatters';
import type { RootStackParamList } from '../navigation/AppNavigator';

const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface WorkoutListProps {
    workouts: WorkoutData[];
    visibleCount: number;
    syncedIds: Set<string>;
    syncingId: string | null;
    onSyncWorkout: (workout: WorkoutData) => void;
    onShowMore: () => void;
}

export function WorkoutList({
    workouts,
    visibleCount,
    syncedIds,
    syncingId,
    onSyncWorkout,
    onShowMore,
}: WorkoutListProps): JSX.Element | null {
    const navigation = useNavigation<NavigationProp>();

    if (workouts.length === 0) return null;

    const openDetail = (workout: WorkoutData) => {
        navigation.navigate('WorkoutDetail', {
            workout,
            isSynced: syncedIds.has(workout.id),
            isSyncing: syncingId === workout.id,
            onSync: onSyncWorkout,
        });
    };

    return (
        <View style={styles.section}>
            {/* Band header */}
            <View style={styles.bandHeader}>
                <Text style={styles.bandTitle}>📱 DEVICE WORKOUTS</Text>
                <Text style={styles.bandRight}>
                    {workouts.length} VIA {platformName.toUpperCase()}
                </Text>
            </View>

            {/* Synced count badge */}
            {syncedIds.size > 0 && (
                <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>
                        ✓ {syncedIds.size} WORKOUT{pluralise(syncedIds.size, '')} SYNCED TO FITGLUE
                    </Text>
                </View>
            )}

            {/* Run rows */}
            {workouts.slice(0, visibleCount).map((workout, index) => {
                const isSynced = syncedIds.has(workout.id);
                const isSyncing = syncingId === workout.id;
                const hasHr = workout.heartRateSamples && workout.heartRateSamples.length > 0;
                const hasRoute = workout.route && workout.route.length > 0;
                const hasCal = workout.calories != null && workout.calories > 0;

                return (
                    <TouchableOpacity
                        key={workout.id || index}
                        style={styles.runRow}
                        activeOpacity={0.7}
                        onPress={() => openDetail(workout)}
                    >
                        {/* Top row: type tag + title + time */}
                        <View style={styles.runTop}>
                            <View style={[styles.typeTag, isSynced ? styles.typeTagInk : styles.typeTagGradientBg]}>
                                <Text style={styles.typeTagText}>{workout.type.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.runTitle} numberOfLines={1}>
                                {workout.startDate.toLocaleDateString(undefined, {
                                    weekday: 'short', day: 'numeric', month: 'short',
                                })}
                            </Text>
                            <Text style={styles.runTime}>
                                {workout.startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>

                        {/* Bottom row: stats + status */}
                        <View style={styles.runBot}>
                            <View style={styles.runStats}>
                                <Text style={styles.runStat}>⏱ {formatDuration(workout.duration)}</Text>
                                {workout.distance != null && workout.distance > 0 && (
                                    <Text style={styles.runStat}>📍 {formatDistance(workout.distance)}</Text>
                                )}
                                {workout.calories != null && workout.calories > 0 && (
                                    <Text style={styles.runStat}>🔥 {workout.calories} CAL</Text>
                                )}
                            </View>

                            {/* Sync control */}
                            {isSynced ? (
                                <View style={styles.syncedPill}>
                                    <Text style={styles.syncedPillText}>✓ SYNCED</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onSyncWorkout(workout);
                                    }}
                                    disabled={isSyncing}
                                    activeOpacity={0.7}
                                >
                                    {isSyncing ? (
                                        <ActivityIndicator size="small" color={colors.violet} />
                                    ) : (
                                        <Text style={styles.syncButtonText}>SYNC →</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Data type pills */}
                        {(hasHr || hasRoute || hasCal) && (
                            <View style={styles.pillRow}>
                                {hasHr && <MiniPill label="❤ HR" />}
                                {hasRoute && <MiniPill label="📍 GPS" />}
                                {hasCal && <MiniPill label="🔥 CAL" />}
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Show more */}
            {workouts.length > visibleCount && (
                <TouchableOpacity
                    style={styles.showMoreRow}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        onShowMore();
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.showMoreText}>
                        LOAD {Math.min(10, workouts.length - visibleCount)} MORE ↓ ({workouts.length - visibleCount} REMAINING)
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

/* ─── Mini Pill ─────────────────────────────────────────────── */

function MiniPill({ label }: { label: string }): JSX.Element {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.lg,
        backgroundColor: colors.ink2,
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
    syncBadge: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(34,211,238,0.08)',
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
    },
    syncBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.cyan,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    runRow: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    runTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    typeTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    typeTagGradientBg: {
        backgroundColor: colors.violet,
    },
    typeTagInk: {
        backgroundColor: colors.ink3,
    },
    typeTagText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.paper,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    runTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: -0.2,
    },
    runTime: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    runBot: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    runStats: {
        flexDirection: 'row',
        gap: spacing.md,
        flex: 1,
    },
    runStat: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    syncedPill: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    syncedPillText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.cyan,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    syncButton: {
        borderWidth: 1,
        borderColor: colors.violet,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        minWidth: 64,
        alignItems: 'center',
    },
    syncButtonText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.violet,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 6,
    },
    pill: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        backgroundColor: colors.ink3,
    },
    pillLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    showMoreRow: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderTopWidth: 1.5,
        borderTopColor: colors.hairline,
    },
    showMoreText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.paper,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
