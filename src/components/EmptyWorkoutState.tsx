/**
 * Empty Workout State Component
 *
 * Shown when health services are initialized but no workouts have been fetched yet.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../theme';

export function EmptyWorkoutState(): JSX.Element {
    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>🏋️</Text>
            <Text style={styles.title}>No workouts yet</Text>
            <Text style={styles.description}>
                Tap "Browse Device Workouts" above to fetch your recent workouts from your health platform.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        padding: spacing.xxl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
    },
    emoji: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
