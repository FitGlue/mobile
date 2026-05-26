/**
 * ScreenHeader — Shared back-nav header for detail screens.
 *
 * Brutal × Aurora top bar with safe-area awareness, a monospace
 * back button (with haptic feedback), a centred title, and an
 * optional right element (falls back to a symmetry spacer).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface ScreenHeaderProps {
    title: string;
    onBackPress: () => void;
    rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, onBackPress, rightElement }: ScreenHeaderProps): JSX.Element {
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onBackPress();
    };

    return (
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Text style={styles.backText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>{title}</Text>
            <View style={styles.topBarRight}>
                {rightElement ?? null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.ink,
        borderBottomWidth: 3,
        borderBottomColor: colors.paper,
    },
    backText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.paper,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    topBarTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    topBarRight: {
        width: 60,
        alignItems: 'flex-end',
    },
});
