/**
 * Dashboard Header Component
 *
 * FitGlue branding, settings gear, and user avatar.
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
        <>
            <View style={[styles.header, { paddingTop: topInset + 12 }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleFit}>Fit</Text>
                        <Text style={styles.titleGlue}>Glue</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onOpenSettings();
                        }}
                        style={styles.settingsButton}
                    >
                        <Text style={styles.settingsIcon}>⚙️</Text>
                    </TouchableOpacity>
                    <LinearGradient
                        colors={gradients.primary}
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>{userInitial}</Text>
                    </LinearGradient>
                </View>
            </View>
            <View style={styles.divider} />
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
    },
    titleFit: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    titleGlue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    settingsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsIcon: {
        fontSize: 18,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: spacing.xl,
    },
});
