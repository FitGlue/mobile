/**
 * Dashboard Link Component — Brutal × Aurora
 *
 * CTA to open the FitGlue web dashboard in the browser.
 * Aurora gradient background band.
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { colors, gradients, spacing } from '../theme';
import { apiConfig } from '../config/environment';

export function DashboardLink(): JSX.Element {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        WebBrowser.openBrowserAsync(`${apiConfig.baseUrl}/app`);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.85}
            style={styles.wrapper}
        >
            <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.band}
            >
                <Text style={styles.title}>OPEN FITGLUE DASHBOARD</Text>
                <Text style={styles.sub}>VIEW PIPELINES · ENRICHED ACTIVITIES →</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.lg,
    },
    band: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        flexDirection: 'column',
        gap: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.ink,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
    },
    sub: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.ink,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        opacity: 0.7,
    },
});
