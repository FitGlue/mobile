/**
 * RoutePreview
 *
 * Pure React Native route visualisation.
 * Normalises GPS coordinates into a bounding box and renders
 * as positioned dots — like a Strava mini-map without needing
 * react-native-maps.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../theme';
import type { RoutePoint } from '../types/health';

const DEFAULT_HEIGHT = 160;
const DOT_SIZE = 3;
const MARKER_SIZE = 8;
const MAX_POINTS = 200;

interface RoutePreviewProps {
    route: RoutePoint[];
    height?: number;
}

/** Downsample route points for rendering performance. */
function downsample(route: RoutePoint[], max: number): RoutePoint[] {
    if (route.length <= max) return route;
    const step = route.length / max;
    const result: RoutePoint[] = [];
    for (let i = 0; i < max; i++) {
        result.push(route[Math.floor(i * step)]);
    }
    // Always include the last point
    result[result.length - 1] = route[route.length - 1];
    return result;
}

export function RoutePreview({ route, height = DEFAULT_HEIGHT }: RoutePreviewProps): JSX.Element {
    if (route.length < 2) {
        return (
            <View style={[styles.container, { height: 40 }]}>
                <Text style={styles.noDataText}>Not enough GPS data to render route</Text>
            </View>
        );
    }

    const points = downsample(route, MAX_POINTS);

    // Compute bounding box
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const p of points) {
        if (p.latitude < minLat) minLat = p.latitude;
        if (p.latitude > maxLat) maxLat = p.latitude;
        if (p.longitude < minLng) minLng = p.longitude;
        if (p.longitude > maxLng) maxLng = p.longitude;
    }

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    // Add 10% padding
    const padLat = latRange * 0.1;
    const padLng = lngRange * 0.1;
    const totalLat = latRange + padLat * 2;
    const totalLng = lngRange + padLat * 2;

    // Use aspect ratio to avoid stretching
    const aspectRatio = totalLng / totalLat;
    const containerWidth = height * Math.max(1, Math.min(aspectRatio, 2.5));

    return (
        <View style={styles.container}>
            <View style={[styles.mapArea, { height, width: '100%', minHeight: height }]}>
                {points.map((point, i) => {
                    // Normalise to 0..1 within padded bounds
                    const x = ((point.longitude - minLng + padLng) / totalLng);
                    const y = 1 - ((point.latitude - minLat + padLat) / totalLat); // flip Y

                    const isFirst = i === 0;
                    const isLast = i === points.length - 1;
                    const isMarker = isFirst || isLast;
                    const size = isMarker ? MARKER_SIZE : DOT_SIZE;

                    return (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    left: `${(x * 100).toFixed(2)}%`,
                                    top: `${(y * 100).toFixed(2)}%`,
                                    backgroundColor: isFirst
                                        ? colors.routeStart
                                        : isLast
                                            ? colors.routeEnd
                                            : colors.routeLine,
                                    opacity: isMarker ? 1 : 0.7,
                                    zIndex: isMarker ? 2 : 1,
                                },
                            ]}
                        />
                    );
                })}
            </View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.routeStart }]} />
                    <Text style={styles.legendText}>Start</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.routeEnd }]} />
                    <Text style={styles.legendText}>End</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: radii.lg,
        padding: spacing.sm,
        marginTop: spacing.sm,
    },
    mapArea: {
        position: 'relative',
        overflow: 'hidden',
    },
    dot: {
        position: 'absolute',
    },
    noDataText: {
        fontSize: 12,
        color: colors.textDim,
        textAlign: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        color: colors.textDim,
    },
});
