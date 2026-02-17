/**
 * FitGlue Mobile Settings Screen
 *
 * User preferences, account info, and app settings.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { environment, apiConfig } from '../config/environment';
import * as StorageService from '../services/StorageService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { formatRelativeTime } from '../utils/formatters';
import { colors, spacing, radii, typography, gradients } from '../theme';
import {
    isBackgroundSyncRegistered,
    registerBackgroundSync,
    unregisterBackgroundSync,
    triggerManualSync,
} from '../services/BackgroundSyncTask';

interface SettingsScreenProps {
    navigation: NativeStackNavigationProp<RootStackParamList>;
}

export function SettingsScreen({ navigation }: SettingsScreenProps): JSX.Element {
    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [bgSyncRegistered, setBgSyncRegistered] = useState(false);

    // Load settings on mount
    useEffect(() => {
        (async () => {
            const enabled = await StorageService.isSyncEnabled();
            setSyncEnabled(enabled);

            const date = await StorageService.getLastSyncDate();
            setLastSync(date);

            const registered = await isBackgroundSyncRegistered();
            setBgSyncRegistered(registered);
        })();
    }, []);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            (async () => {
                const date = await StorageService.getLastSyncDate();
                setLastSync(date);

                const enabled = await StorageService.isSyncEnabled();
                setSyncEnabled(enabled);

                const registered = await isBackgroundSyncRegistered();
                setBgSyncRegistered(registered);
            })();
        }, [])
    );

    const handleToggleSync = useCallback(async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSyncEnabled(value);
        await StorageService.setSyncEnabled(value);

        if (value) {
            await registerBackgroundSync();
            setBgSyncRegistered(true);
        } else {
            await unregisterBackgroundSync();
            setBgSyncRegistered(false);
        }
    }, []);

    const handleManualSync = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSyncing(true);
        try {
            const result = await triggerManualSync();
            if (result.success) {
                const now = new Date();
                setLastSync(now);
                Alert.alert(
                    'Sync Complete',
                    result.processedCount > 0
                        ? `${result.processedCount} workout${result.processedCount !== 1 ? 's' : ''} synced.`
                        : 'No new workouts to sync.'
                );
            } else {
                Alert.alert('Sync Failed', result.error || 'An error occurred during sync.');
            }
        } catch {
            Alert.alert('Sync Error', 'Failed to perform sync. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const handleOpenDashboard = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        WebBrowser.openBrowserAsync(`${apiConfig.baseUrl}/app`);
    }, []);

    const handleOpenPrivacy = useCallback(() => {
        WebBrowser.openBrowserAsync('https://fitglue.tech/privacy');
    }, []);

    const handleOpenTerms = useCallback(() => {
        WebBrowser.openBrowserAsync('https://fitglue.tech/terms');
    }, []);

    const handleSignOut = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await unregisterBackgroundSync();
                        await signOut();
                    },
                },
            ]
        );
    }, [signOut]);

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const platformName = Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.backButton} />
            </View>

            <View style={styles.divider} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Sync Section */}
                <Text style={styles.sectionTitle}>SYNC</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Background Sync</Text>
                            <Text style={styles.settingDescription}>
                                Automatically sync {platformName} data
                            </Text>
                        </View>
                        <Switch
                            value={syncEnabled}
                            onValueChange={handleToggleSync}
                            trackColor={{ false: '#333', true: 'rgba(255, 0, 110, 0.4)' }}
                            thumbColor={syncEnabled ? '#FF006E' : '#666'}
                        />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Last Sync</Text>
                            <Text style={styles.settingDescription}>{formatRelativeTime(lastSync)}</Text>
                        </View>
                        <View style={[
                            styles.statusIndicator,
                            bgSyncRegistered ? styles.statusGreen : styles.statusAmber,
                        ]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
                        onPress={handleManualSync}
                        disabled={isSyncing}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.syncButtonText}>
                            {isSyncing ? 'Syncing…' : 'Sync Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Email</Text>
                            <Text style={styles.settingDescription}>{user?.email || 'Unknown'}</Text>
                        </View>
                    </View>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenDashboard}>
                        <Text style={styles.linkText}>Open FitGlue Dashboard</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <Text style={styles.sectionTitle}>ABOUT</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Version</Text>
                        <Text style={styles.settingValue}>{appVersion}</Text>
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Environment</Text>
                        <Text style={styles.settingValue}>{environment}</Text>
                    </View>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenPrivacy}>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenTerms}>
                        <Text style={styles.linkText}>Terms of Service</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleFit}>Fit</Text>
                        <Text style={styles.titleGlue}>Glue</Text>
                    </View>
                    <Text style={styles.footerText}>
                        Your fitness apps, finally talking.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    backButton: {
        width: 60,
    },
    backText: {
        color: colors.primary,
        fontSize: spacing.lg,
        fontWeight: '600',
    },
    headerTitle: {
        ...typography.titleSm,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: spacing.xl,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: 40,
    },
    sectionTitle: {
        ...typography.label,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        padding: spacing.lg,
        marginBottom: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    settingInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingLabel: {
        ...typography.bodySmall,
    },
    settingDescription: {
        ...typography.caption,
        marginTop: 2,
    },
    settingValue: {
        fontSize: 15,
        color: colors.textMuted,
    },
    settingDivider: {
        height: 1,
        backgroundColor: colors.dividerSubtle,
        marginVertical: spacing.sm,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: radii.sm,
    },
    statusGreen: {
        backgroundColor: colors.success,
    },
    statusAmber: {
        backgroundColor: colors.warning,
    },
    syncButton: {
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: radii.lg,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    syncButtonText: {
        color: colors.primary,
        ...typography.buttonSmall,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    linkText: {
        ...typography.bodySmall,
        color: colors.primary,
    },
    linkArrow: {
        fontSize: 16,
        color: colors.primary,
    },
    signOutButton: {
        backgroundColor: colors.errorSurface,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: radii.xl,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    signOutText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    titleRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    titleFit: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary,
    },
    titleGlue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    footerText: {
        fontSize: 12,
        color: colors.textSubtle,
    },
});
