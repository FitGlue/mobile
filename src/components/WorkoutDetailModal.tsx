/**
 * Workout Detail Modal
 *
 * Full-screen modal that shows all available data for a single workout.
 * Opened by tapping a workout row in WorkoutList.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { colors, spacing, radii } from '../theme';
import { WorkoutData } from '../hooks/useHealth';
import { formatDuration, formatDistance, formatTime } from '../utils/formatters';
import type { HeartRateSample } from '../types/health';

const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

interface WorkoutDetailModalProps {
    workout: WorkoutData | null;
    visible: boolean;
    isSynced: boolean;
    isSyncing: boolean;
    onSync: (workout: WorkoutData) => void;
    onClose: () => void;
}

function computeHrStats(samples: HeartRateSample[]): { avg: number; min: number; max: number } {
    if (samples.length === 0) return { avg: 0, min: 0, max: 0 };
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const s of samples) {
        sum += s.bpm;
        if (s.bpm < min) min = s.bpm;
        if (s.bpm > max) max = s.bpm;
    }
    return { avg: Math.round(sum / samples.length), min, max };
}

export function WorkoutDetailModal({
    workout,
    visible,
    isSynced,
    isSyncing,
    onSync,
    onClose,
}: WorkoutDetailModalProps): JSX.Element {
    if (!workout) return <></>;

    const hrSamples = workout.heartRateSamples;
    const hasHr = hrSamples && hrSamples.length > 0;
    const hrStats = hasHr ? computeHrStats(hrSamples) : null;
    const hasRoute = workout.route && workout.route.length > 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <TouchableOpacity
                    style={styles.backdropTouch}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.activityType}>{workout.type}</Text>
                            <Text style={styles.activityDate}>
                                {workout.startDate.toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Time Window */}
                        <DetailRow
                            icon="🕐"
                            label="Time"
                            value={`${formatTime(workout.startDate)} → ${formatTime(workout.endDate)}`}
                        />

                        {/* Duration */}
                        <DetailRow icon="⏱️" label="Duration" value={formatDuration(workout.duration)} />

                        {/* Distance */}
                        {workout.distance != null && workout.distance > 0 && (
                            <DetailRow icon="📍" label="Distance" value={formatDistance(workout.distance)} />
                        )}

                        {/* Calories */}
                        {workout.calories != null && workout.calories > 0 && (
                            <DetailRow icon="🔥" label="Calories" value={`${workout.calories} cal`} />
                        )}

                        {/* Heart Rate */}
                        {hrStats && (
                            <DetailRow
                                icon="❤️"
                                label="Heart Rate"
                                value={`${hrStats.avg} avg  ·  ${hrStats.min} min  ·  ${hrStats.max} max bpm`}
                            />
                        )}

                        {/* Route */}
                        {hasRoute && (
                            <DetailRow
                                icon="🗺️"
                                label="GPS Route"
                                value={`${workout.route!.length} point${workout.route!.length === 1 ? '' : 's'} recorded`}
                            />
                        )}

                        {/* Source */}
                        <DetailRow icon="📱" label="Source" value={platformName} />

                        {/* Sync hint */}
                        <View style={styles.syncHint}>
                            <Text style={styles.syncHintText}>
                                {isSynced
                                    ? '✓ This workout has been synced to FitGlue and will be processed by your pipelines.'
                                    : 'Tap "Sync" below to send this workout to FitGlue for processing.'}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Action */}
                    <View style={styles.actionBar}>
                        {isSynced ? (
                            <View style={styles.syncedBadgeLarge}>
                                <Text style={styles.syncedBadgeText}>✓ Synced</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
                                onPress={() => onSync(workout)}
                                disabled={isSyncing}
                                activeOpacity={0.7}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.syncButtonText}>Sync →</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/* ─── Detail Row ────────────────────────────────────────────── */

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: string;
    label: string;
    value: string;
}): JSX.Element {
    return (
        <View style={styles.row}>
            <Text style={styles.rowIcon}>{icon}</Text>
            <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
            </View>
        </View>
    );
}

/* ─── Styles ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radii.xxl,
        borderTopRightRadius: radii.xxl,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderBottomWidth: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
    },
    headerLeft: {
        flex: 1,
        marginRight: spacing.md,
    },
    activityType: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    activityDate: {
        fontSize: 14,
        color: colors.textMuted,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    body: {
        flexGrow: 0,
    },
    bodyContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
    },
    rowIcon: {
        fontSize: 18,
        width: 28,
        marginTop: 2,
    },
    rowBody: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textDim,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    rowValue: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    syncHint: {
        marginTop: spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    syncHintText: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
    },
    actionBar: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
        borderTopWidth: 1,
        borderTopColor: colors.dividerSubtle,
    },
    syncButton: {
        backgroundColor: colors.primary,
        borderRadius: radii.lg,
        paddingVertical: 14,
        alignItems: 'center',
    },
    syncButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    syncedBadgeLarge: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderRadius: radii.lg,
        paddingVertical: 14,
        alignItems: 'center',
    },
    syncedBadgeText: {
        color: colors.success,
        fontSize: 16,
        fontWeight: '700',
    },
});
