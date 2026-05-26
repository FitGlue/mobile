/**
 * Workout Detail Screen — Brutal × Aurora
 *
 * Full-screen navigated view for a single workout.
 * Applies showcase-activity archetype: gradient banner, stat trio, section bands.
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
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, spacing } from '../theme';
import { WorkoutData } from '../hooks/useHealth';
import { formatDuration, formatDistance, formatTime } from '../utils/formatters';
import type { HeartRateSample } from '../types/health';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { HeartRateChart } from '../components/HeartRateChart';
import { RoutePreview } from '../components/RoutePreview';
import { ScreenHeader } from '../components/ScreenHeader';

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
            <ScreenHeader
                title={workout.type.toUpperCase()}
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.body}
                showsVerticalScrollIndicator={false}
            >
                {/* Aurora banner */}
                <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.banner}
                >
                    <View style={styles.bannerInner}>
                        <View style={styles.bannerStamp}>
                            <Text style={styles.bannerStampText}>{workout.type.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.bannerTitle}>
                            {workout.startDate.toLocaleDateString(undefined, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            }).toUpperCase()}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Title block */}
                <View style={styles.titleBlock}>
                    {/* Meta tags */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaTag}>
                            <Text style={styles.metaTagText}>{workout.type.toUpperCase()}</Text>
                        </View>
                        <View style={styles.metaTag}>
                            <Text style={styles.metaTagText}>VIA {platformName.toUpperCase()}</Text>
                        </View>
                        {isSynced && (
                            <View style={[styles.metaTag, styles.metaTagCyan]}>
                                <Text style={[styles.metaTagText, styles.metaTagTextCyan]}>✓ SYNCED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.workoutTitle}>
                        {workout.startDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                    </Text>
                </View>

                {/* Hero stats — 3 across */}
                <View style={styles.statsRow}>
                    <StatCell
                        emoji="⏱"
                        value={formatDuration(workout.duration)}
                        label="DURATION"
                        gradient={false}
                    />
                    {hrStats ? (
                        <StatCell
                            emoji="❤"
                            value={String(hrStats.avg)}
                            unit="BPM"
                            label="AVG HR"
                            gradient={true}
                        />
                    ) : workout.distance != null && workout.distance > 0 ? (
                        <StatCell
                            emoji="📍"
                            value={formatDistance(workout.distance)}
                            label="DISTANCE"
                            gradient={true}
                        />
                    ) : (
                        <StatCell
                            emoji="📊"
                            value="—"
                            label="NO DATA"
                            gradient={false}
                        />
                    )}
                    {workout.calories != null && workout.calories > 0 ? (
                        <StatCell
                            emoji="🔥"
                            value={String(workout.calories)}
                            unit="CAL"
                            label="CALORIES"
                            gradient={false}
                        />
                    ) : (
                        <StatCell
                            emoji="📏"
                            value={workout.distance != null && workout.distance > 0 ? formatDistance(workout.distance) : '—'}
                            label="DISTANCE"
                            gradient={false}
                        />
                    )}
                </View>

                {/* Detail rows */}
                <SectionBand label="📋 DETAILS" right="ALL DATA" />

                <DetailRow icon="🕐" label="TIME" value={`${formatTime(workout.startDate)} → ${formatTime(workout.endDate)}`} />
                <DetailRow icon="⏱" label="DURATION" value={formatDuration(workout.duration)} />

                {workout.distance != null && workout.distance > 0 && (
                    <DetailRow icon="📏" label="DISTANCE" value={formatDistance(workout.distance)} />
                )}
                {workout.calories != null && workout.calories > 0 && (
                    <DetailRow icon="🔥" label="CALORIES" value={`${workout.calories} cal`} />
                )}

                {/* Heart Rate */}
                {hrStats && (
                    <>
                        <SectionBand label="❤ HEART RATE" right={`${hrSamples!.length} SAMPLES`} />
                        <View style={styles.hrMiniGrid}>
                            <HrMini value={String(hrStats.min)} label="MIN BPM" />
                            <HrMini value={String(hrStats.avg)} label="AVG BPM" gradient />
                            <HrMini value={String(hrStats.max)} label="MAX BPM" />
                        </View>
                        <View style={styles.chartWrapper}>
                            <HeartRateChart samples={hrSamples!} />
                        </View>
                    </>
                )}

                {/* GPS Route */}
                {hasRoute && (
                    <>
                        <SectionBand label="🗺 GPS ROUTE" right={`${workout.route!.length} PTS`} />
                        <View style={styles.routeWrapper}>
                            <DetailRow icon="📍" label="POINTS" value={`${workout.route!.length} recorded`} />
                            <RoutePreview route={workout.route!} />
                        </View>
                    </>
                )}

                {/* Source */}
                <SectionBand label="📱 SOURCE" right="PLATFORM" />
                <DetailRow icon="📱" label="SOURCE" value={platformName} />

                {/* Data availability pills */}
                <View style={styles.pillSection}>
                    {hasHr && <DataPill emoji="❤" label="Heart Rate" />}
                    {hasRoute && <DataPill emoji="📍" label="GPS" />}
                    {workout.calories != null && workout.calories > 0 && <DataPill emoji="🔥" label="Calories" />}
                    {workout.distance != null && workout.distance > 0 && <DataPill emoji="📏" label="Distance" />}
                </View>

                {/* Sync hint */}
                <View style={styles.syncHint}>
                    <Text style={styles.syncHintText}>
                        {isSynced
                            ? '✓ THIS WORKOUT HAS BEEN SYNCED AND WILL BE PROCESSED BY YOUR PIPELINES.'
                            : 'TAP "SYNC →" BELOW TO SEND THIS WORKOUT TO FITGLUE FOR PROCESSING.'}
                    </Text>
                </View>

                <View style={styles.bottomPad} />
            </ScrollView>

            {/* Action bar */}
            <View style={styles.actionBar}>
                {isSynced ? (
                    <View style={styles.syncedBand}>
                        <Text style={styles.syncedBandText}>✓ SYNCED TO FITGLUE</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.buttonWrapper, isSyncing && styles.buttonDisabled]}
                        onPress={() => onSync(workout)}
                        disabled={isSyncing}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.syncButton}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color={colors.ink} />
                            ) : (
                                <Text style={styles.syncButtonText}>SYNC →</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

/* ─── Section Band ──────────────────────────────────────────── */

function SectionBand({ label, right }: { label: string; right: string }): JSX.Element {
    return (
        <View style={bandStyles.band}>
            <Text style={bandStyles.label}>{label}</Text>
            <Text style={bandStyles.right}>{right}</Text>
        </View>
    );
}

const bandStyles = StyleSheet.create({
    band: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.ink,
        borderTopWidth: 1.5,
        borderTopColor: colors.hairline,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    label: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    right: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});

/* ─── Stat Cell ─────────────────────────────────────────────── */

function StatCell({ emoji, value, unit, label, gradient }: {
    emoji: string;
    value: string;
    unit?: string;
    label: string;
    gradient: boolean;
}): JSX.Element {
    return (
        <View style={statStyles.cell}>
            <Text style={statStyles.emoji}>{emoji}</Text>
            <Text style={[statStyles.value, gradient && statStyles.valueGradient]}>
                {value}
                {unit ? <Text style={statStyles.unit}> {unit}</Text> : null}
            </Text>
            <Text style={statStyles.label}>{label}</Text>
        </View>
    );
}

const statStyles = StyleSheet.create({
    cell: {
        flex: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md,
        borderRightWidth: 1.5,
        borderRightColor: colors.hairline,
    },
    emoji: {
        fontSize: 14,
        marginBottom: 4,
    },
    value: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.paper,
        letterSpacing: -0.5,
        lineHeight: 30,
    },
    valueGradient: {
        color: colors.cyan,
    },
    unit: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '400',
    },
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginTop: 4,
    },
});

/* ─── HR Mini ───────────────────────────────────────────────── */

function HrMini({ value, label, gradient }: { value: string; label: string; gradient?: boolean }): JSX.Element {
    return (
        <View style={hrStyles.cell}>
            <Text style={[hrStyles.value, gradient && hrStyles.valueGradient]}>{value}</Text>
            <Text style={hrStyles.label}>{label}</Text>
        </View>
    );
}

const hrStyles = StyleSheet.create({
    cell: {
        flex: 1,
        paddingHorizontal: spacing.sm,
    },
    value: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.paper,
        letterSpacing: -0.3,
    },
    valueGradient: {
        color: colors.cyan,
    },
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginTop: 2,
    },
});

/* ─── Detail Row ────────────────────────────────────────────── */

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }): JSX.Element {
    return (
        <View style={rowStyles.row}>
            <Text style={rowStyles.icon}>{icon}</Text>
            <View style={rowStyles.body}>
                <Text style={rowStyles.label}>{label}</Text>
                <Text style={rowStyles.value}>{value}</Text>
            </View>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
        backgroundColor: colors.ink2,
    },
    icon: {
        fontSize: 16,
        width: 26,
        marginTop: 2,
    },
    body: {
        flex: 1,
    },
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textDim,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    value: {
        fontSize: 14,
        color: colors.paper,
        fontWeight: '600',
    },
});

/* ─── Data Pill ─────────────────────────────────────────────── */

function DataPill({ emoji, label }: { emoji: string; label: string }): JSX.Element {
    return (
        <View style={pillStyles.pill}>
            <Text style={pillStyles.emoji}>{emoji}</Text>
            <Text style={pillStyles.label}>{label.toUpperCase()}</Text>
        </View>
    );
}

const pillStyles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: colors.ink3,
    },
    emoji: {
        fontSize: 11,
    },
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});

/* ─── Main Styles ───────────────────────────────────────────── */

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.ink,
    },
    body: {
        flex: 1,
    },
    // Aurora banner
    banner: {
        paddingTop: spacing.xxl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    bannerInner: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(10,10,15,0.4)',
        padding: spacing.md,
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 100,
    },
    bannerStamp: {
        alignSelf: 'flex-start',
        backgroundColor: colors.ink,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
    },
    bannerStampText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.paper,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.ink,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
        marginTop: spacing.md,
    },
    // Title block
    titleBlock: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.ink2,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: spacing.sm,
        flexWrap: 'wrap',
    },
    metaTag: {
        backgroundColor: colors.ink3,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    metaTagCyan: {
        backgroundColor: 'rgba(34,211,238,0.15)',
    },
    metaTagText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    metaTagTextCyan: {
        color: colors.cyan,
    },
    workoutTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
    },
    // Stats row
    statsRow: {
        flexDirection: 'row',
        backgroundColor: colors.ink2,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
        paddingVertical: spacing.md,
    },
    // HR grid
    hrMiniGrid: {
        flexDirection: 'row',
        backgroundColor: colors.ink2,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    chartWrapper: {
        backgroundColor: colors.ink2,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    routeWrapper: {
        backgroundColor: colors.ink2,
    },
    // Pills section
    pillSection: {
        flexDirection: 'row',
        gap: 4,
        flexWrap: 'wrap',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.ink2,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    // Sync hint
    syncHint: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.ink,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    syncHintText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    bottomPad: {
        height: 20,
    },
    // Action bar
    actionBar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
        backgroundColor: colors.ink,
        borderTopWidth: 3,
        borderTopColor: colors.paper,
    },
    syncedBand: {
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(34,211,238,0.10)',
        borderWidth: 1,
        borderColor: colors.cyan,
    },
    syncedBandText: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.cyan,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    buttonWrapper: {},
    syncButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    syncButtonText: {
        color: colors.ink,
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
