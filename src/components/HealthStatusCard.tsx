/**
 * Health Status Card Component
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
import { colors, gradients, spacing, radii } from '../theme';

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
            <Text style={styles.cardTitle}>
                🏥 {platformName}
            </Text>
            <Text style={styles.cardDescription}>
                {isInitialized
                    ? 'Your health data is connected and ready to sync.'
                    : `Connect to ${platformName} to start syncing your workouts.`}
            </Text>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Available</Text>
                <View style={[styles.statusDot, isAvailable ? styles.dotGreen : styles.dotRed]} />
            </View>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Initialized</Text>
                <View style={[styles.statusDot, isInitialized ? styles.dotGreen : styles.dotRed]} />
            </View>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Workouts</Text>
                {permissions.workouts ? (
                    <Text style={styles.checkmark}>✓</Text>
                ) : (
                    <View style={styles.emptyCircle} />
                )}
            </View>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Heart Rate</Text>
                {permissions.heartRate ? (
                    <Text style={styles.checkmark}>✓</Text>
                ) : (
                    <View style={styles.emptyCircle} />
                )}
            </View>

            {healthError && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>⚠️ Connection Issue</Text>
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
                        <Text style={styles.retryButtonText}>Retry Connection</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Connection status banner */}
            {connectionStatus === 'connecting' && (
                <View style={styles.connectionBanner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.connectionBannerText}>
                        Enabling {platformName} connection in FitGlue…
                    </Text>
                </View>
            )}
            {connectionStatus === 'connected' && (
                <View style={[styles.connectionBanner, styles.connectionBannerSuccess]}>
                    <Text style={styles.connectionSuccessIcon}>✓</Text>
                    <Text style={styles.connectionBannerTextSuccess}>
                        Enabled! You can now use {platformName} as a source.
                    </Text>
                </View>
            )}
            {connectionStatus === 'error' && (
                <View style={[styles.connectionBanner, styles.connectionBannerError]}>
                    <Text style={styles.connectionBannerTextError}>
                        Failed to register {platformName} connection. Sync will still work — the connection will be registered on first sync.
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
                            {loading ? 'Connecting…' : `Connect to ${platformName}`}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dotGreen: {
        backgroundColor: colors.success,
    },
    dotRed: {
        backgroundColor: colors.error,
    },
    checkmark: {
        color: '#14b8a6',
        fontSize: 18,
        fontWeight: '600',
    },
    emptyCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: colors.textSubtle,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: radii.md,
        padding: spacing.md,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
        marginBottom: spacing.sm,
    },
    errorTitle: {
        color: colors.error,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    errorGuidance: {
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    retryButton: {
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: radii.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    retryButtonText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    connectionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primarySurfaceLight,
        borderRadius: radii.lg,
        padding: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        gap: 10,
    },
    connectionBannerSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    connectionBannerError: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    connectionBannerText: {
        color: colors.primary,
        fontSize: 13,
        flex: 1,
    },
    connectionBannerTextSuccess: {
        color: colors.success,
        fontSize: 13,
        flex: 1,
    },
    connectionBannerTextError: {
        color: colors.error,
        fontSize: 13,
        flex: 1,
    },
    connectionSuccessIcon: {
        color: colors.success,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonWrapper: {
        borderRadius: radii.lg,
        overflow: 'hidden',
        marginTop: spacing.md,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: radii.lg,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});
