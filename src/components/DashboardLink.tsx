/**
 * Dashboard Link Component
 *
 * CTA to open the FitGlue web dashboard in the browser.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { colors, gradients, spacing, radii } from '../theme';
import { apiConfig } from '../config/environment';

export function DashboardLink(): JSX.Element {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        WebBrowser.openBrowserAsync(`${apiConfig.baseUrl}/app`);
    };

    return (
        <TouchableOpacity
            style={styles.dashboardLink}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <LinearGradient
                colors={gradients.primarySurface}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dashboardLinkInner}
            >
                <View>
                    <Text style={styles.dashboardLinkTitle}>Open FitGlue Dashboard</Text>
                    <Text style={styles.dashboardLinkSubtitle}>
                        View enriched activities, manage pipelines, and more
                    </Text>
                </View>
                <Text style={styles.dashboardLinkArrow}>→</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    dashboardLink: {
        borderRadius: radii.xxl,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 110, 0.2)',
    },
    dashboardLinkInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
    },
    dashboardLinkTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    dashboardLinkSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
    },
    dashboardLinkArrow: {
        fontSize: 20,
        color: colors.primary,
        marginLeft: spacing.md,
    },
});
