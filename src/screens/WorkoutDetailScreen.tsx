/**
 * Workout Detail Screen
 *
 * Full-screen navigated view showing all available data for a single workout.
 * Replaces the previous WorkoutDetailModal bottom sheet.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, radii } from '../theme';
import { WorkoutData } from '../hooks/useHealth';
import { formatDuration, formatDistance, formatTime } from '../utils/formatters';
import type { HeartRateSample } from '../types/health';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { HeartRateChart } from '../components/HeartRateChart';
import { RoutePreview } from '../components/RoutePreview';

const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

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

export function WorkoutDetailScreen({ route, navigation }: Props): JSX.Element {
    const { workout, isSynced, isSyncing, onSync } = route.params;

    const hrSamples = workout.heartRateSamples;
    const hasHr = hrSamples && hrSamples.length > 0;
    const hrStats = hasHr ? computeHrStats(hrSamples) : null;
    const hasRoute = workout.route && workout.route.length > 0;

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
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
                <View style={styles.headerRight} />
            </View>

            {/* Data pills */}
            <View style={styles.pillRow}>
                {hasHr && <DataPill emoji="❤️" label="Heart Rate" />}
                {hasRoute && <DataPill emoji="📍" label="GPS" />}
                {workout.calories != null && workout.calories > 0 && (
                    <DataPill emoji="🔥" label="Calories" />
                )}
                {workout.distance != null && workout.distance > 0 && (
                    <DataPill emoji="📏" label="Distance" />
                )}
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
                    <DetailRow icon="📏" label="Distance" value={formatDistance(workout.distance)} />
                )}

                {/* Calories */}
                {workout.calories != null && workout.calories > 0 && (
                    <DetailRow icon="🔥" label="Calories" value={`${workout.calories} cal`} />
                )}

                {/* Heart Rate */}
                {hrStats && (
                    <>
                        <DetailRow
                            icon="❤️"
                            label="Heart Rate"
                            value={`${hrStats.avg} avg  ·  ${hrStats.min} min  ·  ${hrStats.max} max bpm`}
                        />
                        <HeartRateChart samples={hrSamples!} />
                    </>
                )}

                {/* Route */}
                {hasRoute && (
                    <>
                        <DetailRow
                            icon="🗺️"
                            label="GPS Route"
                            value={`${workout.route!.length} point${workout.route!.length === 1 ? '' : 's'} recorded`}
                        />
                        <RoutePreview route={workout.route!} />
                    </>
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
    );
}

/* ─── Data Pill ─────────────────────────────────────────────── */

function DataPill({ emoji, label }: { emoji: string; label: string }): JSX.Element {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillEmoji}>{emoji}</Text>
            <Text style={styles.pillLabel}>{label}</Text>
        </View>
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
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxxl + 16, // account for status bar
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
        backgroundColor: colors.surface,
    },
    backButton: {
        paddingVertical: spacing.xs,
        paddingRight: spacing.md,
    },
    backText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 60, // balance the back button
    },
    activityType: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    activityDate: {
        fontSize: 13,
        color: colors.textMuted,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.pillBackground,
        borderWidth: 1,
        borderColor: colors.pillBorder,
        borderRadius: radii.round,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
    },
    pillEmoji: {
        fontSize: 12,
    },
    pillLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
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
        backgroundColor: colors.surface,
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
