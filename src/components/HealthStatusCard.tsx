/**
 * Health Status Card Component — Brutal × Aurora
 *
 * Shows health platform availability, initialization, permissions,
 * connection banners, and the connect button.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, gradients, spacing } from '../theme';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface HealthStatusCardProps {
    isAvailable: boolean;
    isInitialized: boolean;
    permissions: { workouts: boolean; heartRate: boolean };
    connectionStatus: ConnectionStatus;
    healthError: string | null;
    loading: boolean;
    onInitialize: () => void;
}

const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

export function HealthStatusCard({
    isAvailable,
    isInitialized,
    permissions,
    connectionStatus,
    healthError,
    loading,
    onInitialize,
}: HealthStatusCardProps): JSX.Element {
    return (
        <View style={styles.card}>
            {/* Section band header */}
            <View style={styles.bandHeader}>
                <Text style={styles.bandTitle}>🏥 {platformName.toUpperCase()}</Text>
                <Text style={styles.bandRight}>
                    {isInitialized ? 'CONNECTED' : 'SETUP REQUIRED'}
                </Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.cardDescription}>
                    {isInitialized
                        ? 'Your health data is connected and ready to sync.'
                        : `Connect to ${platformName} to start syncing your workouts.`}
                </Text>

                {/* Status rows */}
                <StatusRow label="AVAILABLE" active={isAvailable} />
                <StatusRow label="INITIALIZED" active={isInitialized} />
                <StatusRow label="WORKOUTS" active={permissions.workouts} />
                <StatusRow label="HEART RATE" active={permissions.heartRate} />

                {healthError && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTitle}>⚠ CONNECTION ISSUE</Text>
                        <Text style={styles.errorText}>{healthError}</Text>
                        <Text style={styles.errorGuidance}>
                            {Platform.OS === 'android'
                                ? 'Make sure Health Connect is installed from the Play Store and you have granted permissions.'
                                : 'Go to Settings → Privacy & Security → Health → FitGlue and ensure permissions are enabled.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onInitialize();
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.retryButtonText}>RETRY CONNECTION →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Connection status banners */}
                {connectionStatus === 'connecting' && (
                    <View style={styles.connectionBanner}>
                        <ActivityIndicator size="small" color={colors.violet} />
                        <Text style={styles.connectionBannerText}>
                            ENABLING {platformName.toUpperCase()}…
                        </Text>
                    </View>
                )}
                {connectionStatus === 'connected' && (
                    <View style={[styles.connectionBanner, styles.connectionBannerSuccess]}>
                        <Text style={styles.connectionBannerTextSuccess}>
                            ✓ ENABLED — {platformName.toUpperCase()} AS SOURCE
                        </Text>
                    </View>
                )}
                {connectionStatus === 'error' && (
                    <View style={[styles.connectionBanner, styles.connectionBannerError]}>
                        <Text style={styles.connectionBannerTextError}>
                            FAILED TO REGISTER — SYNC WILL STILL WORK
                        </Text>
                    </View>
                )}

                {!isInitialized && (
                    <TouchableOpacity
                        style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onInitialize();
                        }}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'CONNECTING…' : `CONNECT ${platformName.toUpperCase()} →`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function StatusRow({ label, active }: { label: string; active: boolean }): JSX.Element {
    return (
        <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{label}</Text>
            <View style={[styles.statusDot, active ? styles.dotCyan : styles.dotRose]} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.ink2,
        marginBottom: spacing.lg,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    bandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.ink,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    bandTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bandRight: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    body: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.dividerSubtle,
    },
    statusLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotCyan: {
        backgroundColor: colors.cyan,
    },
    dotRose: {
        backgroundColor: colors.rose,
    },
    errorBox: {
        borderWidth: 1.5,
        borderColor: colors.rose,
        padding: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    errorText: {
        color: colors.rose,
        fontSize: 13,
        marginBottom: spacing.sm,
        fontFamily: 'monospace',
    },
    errorTitle: {
        color: colors.rose,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    errorGuidance: {
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    retryButton: {
        borderWidth: 1.5,
        borderColor: colors.rose,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    retryButtonText: {
        color: colors.rose,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    connectionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139,92,246,0.10)',
        borderWidth: 1,
        borderColor: colors.violet,
        padding: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        gap: 10,
    },
    connectionBannerSuccess: {
        backgroundColor: 'rgba(34,211,238,0.10)',
        borderColor: colors.cyan,
    },
    connectionBannerError: {
        backgroundColor: 'rgba(255,61,166,0.10)',
        borderColor: colors.rose,
    },
    connectionBannerText: {
        color: colors.violet,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
        flex: 1,
    },
    connectionBannerTextSuccess: {
        color: colors.cyan,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
        flex: 1,
    },
    connectionBannerTextError: {
        color: colors.rose,
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
        flex: 1,
    },
    buttonWrapper: {
        marginTop: spacing.lg,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.ink,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
