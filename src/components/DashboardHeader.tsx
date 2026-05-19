/**
 * Dashboard Header Component — Brutal × Aurora
 *
 * Top app bar: FITGLUE wordmark left, settings + avatar right.
 * Border-bottom: 3px paper (BA rule). No border-radius.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, gradients, spacing } from '../theme';

interface DashboardHeaderProps {
    userInitial: string;
    onOpenSettings: () => void;
    topInset: number;
}

export function DashboardHeader({ userInitial, onOpenSettings, topInset }: DashboardHeaderProps): JSX.Element {
    return (
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
            {/* Wordmark */}
            <Text style={styles.wordmark}>FITGLUE</Text>

            {/* Right controls */}
            <View style={styles.headerRight}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onOpenSettings();
                    }}
                    style={styles.settingsButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={styles.settingsLabel}>⚙ YOU</Text>
                </TouchableOpacity>

                {/* Avatar — round is the BA exception for avatars */}
                <LinearGradient
                    colors={gradients.primary}
                    style={styles.avatar}
                >
                    <Text style={styles.avatarText}>{userInitial}</Text>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.ink,
        borderBottomWidth: 3,
        borderBottomColor: colors.paper,
    },
    wordmark: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.paper,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    settingsButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    settingsLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    // Avatar — BA exception: round only for avatars
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: colors.ink,
        fontSize: 13,
        fontWeight: '900',
    },
});
