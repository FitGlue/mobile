/**
 * Workout List Component
 *
 * Displays device workouts with per-item sync buttons,
 * sync status badges, and show-more pagination.
 */

import React, { useState } from 'react';
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
import { colors, spacing, radii } from '../theme';
import { WorkoutData } from '../hooks/useHealth';
import { formatDuration, formatDistance, pluralise } from '../utils/formatters';
import { WorkoutDetailModal } from './WorkoutDetailModal';

const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    const [selectedWorkout, setSelectedWorkout] = useState<WorkoutData | null>(null);

    if (workouts.length === 0) return null;

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Device Workouts</Text>
            <Text style={styles.cardDescription}>
                {workouts.length} workout{pluralise(workouts.length, '')} found on your device via {platformName}.{' '}
                Tap any workout to view details, or hit "Sync →" to send it to FitGlue.
            </Text>

            {/* Sync context */}
            {syncedIds.size > 0 && (
                <View style={styles.syncContextBanner}>
                    <Text style={styles.syncContextText}>
                        ✓ {syncedIds.size} workout{pluralise(syncedIds.size, '')} synced to FitGlue this session
                    </Text>
                </View>
            )}

            {workouts.slice(0, visibleCount).map((workout, index) => {
                const isSynced = syncedIds.has(workout.id);
                const isSyncing = syncingId === workout.id;
                return (
                    <TouchableOpacity
                        key={workout.id || index}
                        style={styles.workoutItem}
                        activeOpacity={0.7}
                        onPress={() => setSelectedWorkout(workout)}
                    >
                        <View style={styles.workoutHeader}>
                            <Text style={styles.workoutType}>{workout.type}</Text>
                            <Text style={styles.workoutDate}>
                                {workout.startDate.toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.workoutRow}>
                            <View style={styles.workoutStats}>
                                <Text style={styles.workoutStat}>
                                    ⏱️ {formatDuration(workout.duration)}
                                </Text>
                                {workout.distance && (
                                    <Text style={styles.workoutStat}>
                                        📍 {formatDistance(workout.distance)}
                                    </Text>
                                )}
                                {workout.calories && (
                                    <Text style={styles.workoutStat}>
                                        🔥 {workout.calories} cal
                                    </Text>
                                )}
                            </View>
                            {isSynced ? (
                                <View style={styles.syncedBadge}>
                                    <Text style={styles.syncedBadgeText}>✓ Synced</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.syncWorkoutButton, isSyncing && styles.buttonDisabled]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onSyncWorkout(workout);
                                    }}
                                    disabled={isSyncing}
                                    activeOpacity={0.7}
                                >
                                    {isSyncing ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Text style={styles.syncWorkoutButtonText}>Sync →</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* Detail Modal */}
            <WorkoutDetailModal
                workout={selectedWorkout}
                visible={selectedWorkout !== null}
                isSynced={selectedWorkout ? syncedIds.has(selectedWorkout.id) : false}
                isSyncing={selectedWorkout ? syncingId === selectedWorkout.id : false}
                onSync={onSyncWorkout}
                onClose={() => setSelectedWorkout(null)}
            />

            {workouts.length > visibleCount && (
                <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        onShowMore();
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.showMoreText}>
                        Show {Math.min(10, workouts.length - visibleCount)} more ({workouts.length - visibleCount} remaining)
                    </Text>
                </TouchableOpacity>
            )}
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
    cardDescription: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    syncContextBanner: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    syncContextText: {
        color: colors.textMuted,
        fontSize: 12,
    },
    workoutItem: {
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    workoutType: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    workoutDate: {
        fontSize: 13,
        color: colors.textMuted,
    },
    workoutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workoutStats: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    workoutStat: {
        fontSize: 13,
        color: '#ccc',
    },
    showMoreButton: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    showMoreText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    syncWorkoutButton: {
        backgroundColor: colors.primarySurface,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        minWidth: 70,
        alignItems: 'center',
    },
    syncWorkoutButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    syncedBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    syncedBadgeText: {
        color: colors.success,
        fontSize: 12,
        fontWeight: '600',
    },
});
