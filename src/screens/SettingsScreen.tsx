/**
 * FitGlue Mobile Settings Screen — Brutal × Aurora
 *
 * Section headers styled as BA bands. Cards are flat ink-2 panels.
 * No border-radius except status dots.
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { environment, apiConfig } from '../config/environment';
import * as StorageService from '../services/StorageService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { formatRelativeTime } from '../utils/formatters';
import { colors, spacing, gradients } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
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
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [bgSyncRegistered, setBgSyncRegistered] = useState(false);

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

            <ScreenHeader
                title="SETTINGS"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                {/* ── SYNC SECTION ── */}
                <SectionBand label="🔄 SYNC" right="BACKGROUND" />
                <View style={styles.panel}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Background Sync</Text>
                            <Text style={styles.settingDesc}>
                                Auto-sync {platformName} data
                            </Text>
                        </View>
                        <Switch
                            value={syncEnabled}
                            onValueChange={handleToggleSync}
                            trackColor={{
                                false: colors.trackInactive,
                                true: 'rgba(255,61,166,0.4)',
                            }}
                            thumbColor={syncEnabled ? colors.pink : colors.thumbInactive}
                        />
                    </View>

                    <View style={styles.hairline} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Last Sync</Text>
                            <Text style={styles.settingDesc}>{formatRelativeTime(lastSync)}</Text>
                        </View>
                        <View style={[
                            styles.statusDot,
                            bgSyncRegistered ? styles.dotCyan : styles.dotAmber,
                        ]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
                        onPress={handleManualSync}
                        disabled={isSyncing}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.syncButtonText}>
                                {isSyncing ? 'SYNCING…' : 'SYNC NOW →'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── ACCOUNT SECTION ── */}
                <SectionBand label="👤 ACCOUNT" right="YOUR PROFILE" />
                <View style={styles.panel}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Email</Text>
                            <Text style={styles.settingDesc}>{user?.email || 'Unknown'}</Text>
                        </View>
                    </View>

                    <View style={styles.hairline} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenDashboard}>
                        <Text style={styles.linkText}>OPEN FITGLUE DASHBOARD</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* ── ABOUT SECTION ── */}
                <SectionBand label="ℹ ABOUT" right="APP INFO" />
                <View style={styles.panel}>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>VERSION</Text>
                        <Text style={styles.settingValue}>{appVersion}</Text>
                    </View>

                    <View style={styles.hairline} />

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>ENVIRONMENT</Text>
                        <Text style={styles.settingValue}>{environment.toUpperCase()}</Text>
                    </View>

                    <View style={styles.hairline} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenPrivacy}>
                        <Text style={styles.linkText}>PRIVACY POLICY</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>

                    <View style={styles.hairline} />

                    <TouchableOpacity style={styles.linkRow} onPress={handleOpenTerms}>
                        <Text style={styles.linkText}>TERMS OF SERVICE</Text>
                        <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* ── SIGN OUT ── */}
                <SectionBand label="⚠ DANGER ZONE" right="" />
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Text style={styles.signOutText}>SIGN OUT</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerWordmark}>FITGLUE</Text>
                    <Text style={styles.footerSub}>YOUR FITNESS APPS, FINALLY TALKING.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

/* ─── Section Band ──────────────────────────────────────────── */

function SectionBand({ label, right }: { label: string; right: string }): JSX.Element {
    return (
        <View style={sectionBandStyles.band}>
            <Text style={sectionBandStyles.label}>{label}</Text>
            {right ? <Text style={sectionBandStyles.right}>{right}</Text> : null}
        </View>
    );
}

const sectionBandStyles = StyleSheet.create({
    band: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.ink,
        borderTopWidth: 1.5,
        borderTopColor: colors.hairline,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
        marginTop: spacing.lg,
    },
    label: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    right: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});

/* ─── Screen Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ink,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 48,
    },
    // Flat panel (no border-radius in BA)
    panel: {
        backgroundColor: colors.ink2,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.hairline,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    settingInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    settingDesc: {
        fontSize: 11,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingValue: {
        fontSize: 11,
        color: colors.textSecondary,
        fontFamily: 'monospace',
        textTransform: 'uppercase',
    },
    hairline: {
        height: 1,
        backgroundColor: colors.hairline,
    },
    // Status dot — round is allowed for dots
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotCyan: {
        backgroundColor: colors.cyan,
    },
    dotAmber: {
        backgroundColor: colors.warning,
    },
    syncButton: {
        marginVertical: spacing.md,
    },
    gradientButton: {
        paddingVertical: 13,
        alignItems: 'center',
    },
    syncButtonText: {
        color: colors.ink,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    linkText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    linkArrow: {
        fontSize: 14,
        color: colors.textMuted,
    },
    signOutButton: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.rose,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    signOutText: {
        color: colors.rose,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    footerWordmark: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    footerSub: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSubtle,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});
