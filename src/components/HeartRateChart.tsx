/**
 * HeartRateChart
 *
 * Pure React Native bar chart for heart rate samples.
 * No external charting library — uses View elements with dynamic heights.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../theme';
import type { HeartRateSample } from '../types/health';

const MAX_BARS = 60;
const DEFAULT_HEIGHT = 120;

interface HeartRateChartProps {
    samples: HeartRateSample[];
    height?: number;
}

/** Downsample by picking evenly-spaced indices. */
function downsample(samples: HeartRateSample[], maxBars: number): HeartRateSample[] {
    if (samples.length <= maxBars) return samples;
    const step = samples.length / maxBars;
    const result: HeartRateSample[] = [];
    for (let i = 0; i < maxBars; i++) {
        result.push(samples[Math.floor(i * step)]);
    }
    return result;
}

/** Map BPM to a HR-zone colour. */
function bpmColor(bpm: number): string {
    if (bpm < 120) return colors.hrZoneLow;
    if (bpm < 150) return colors.hrZoneMod;
    if (bpm < 175) return colors.hrZoneHigh;
    return colors.hrZoneMax;
}

export function HeartRateChart({ samples, height = DEFAULT_HEIGHT }: HeartRateChartProps): JSX.Element {
    const bars = downsample(samples, MAX_BARS);

    // Compute range for scaling
    const bpms = bars.map((s) => s.bpm);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);
    const range = maxBpm - minBpm || 1; // avoid division by zero

    return (
        <View style={styles.container}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
                <Text style={styles.axisLabel}>{maxBpm}</Text>
                <Text style={styles.axisLabel}>{Math.round((maxBpm + minBpm) / 2)}</Text>
                <Text style={styles.axisLabel}>{minBpm}</Text>
            </View>

            {/* Bars */}
            <View style={[styles.chartArea, { height }]}>
                {bars.map((sample, i) => {
                    const fraction = (sample.bpm - minBpm) / range;
                    const barHeight = Math.max(2, fraction * (height - 4));
                    return (
                        <View
                            key={i}
                            style={[
                                styles.bar,
                                {
                                    height: barHeight,
                                    backgroundColor: bpmColor(sample.bpm),
                                },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: radii.lg,
        padding: spacing.sm,
        marginTop: spacing.sm,
    },
    yAxis: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginRight: spacing.xs,
        paddingVertical: 2,
        width: 30,
    },
    axisLabel: {
        fontSize: 9,
        color: colors.textDim,
        fontVariant: ['tabular-nums'],
    },
    chartArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1,
    },
    bar: {
        flex: 1,
        borderRadius: 1,
        minWidth: 2,
    },
});
