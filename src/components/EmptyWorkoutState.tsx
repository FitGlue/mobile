/**
 * Empty Workout State Component — Brutal × Aurora
 *
 * Shown when health services are initialized but no workouts have been fetched yet.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export function EmptyWorkoutState(): JSX.Element {
    return (
        <View style={styles.container}>
            <View style={styles.uploadBox}>
                <Text style={styles.emoji}>📂</Text>
                <Text style={styles.title}>NO WORKOUTS YET</Text>
                <Text style={styles.description}>
                    TAP "BROWSE DEVICE WORKOUTS" ABOVE TO FETCH YOUR RECENT WORKOUTS
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        backgroundColor: colors.ink2,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    uploadBox: {
        padding: spacing.xxl,
        borderWidth: 2.5,
        borderStyle: 'dashed',
        borderColor: colors.paper,
        alignItems: 'center',
        backgroundColor: 'rgba(34,211,238,0.04)',
    },
    emoji: {
        fontSize: 32,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 16,
    },
});
