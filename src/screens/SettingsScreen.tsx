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
    Linking,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { environment } from '../config/environment';
import * as StorageService from '../services/StorageService';
import {
    isBackgroundSyncRegistered,
    registerBackgroundSync,
    unregisterBackgroundSync,
    triggerManualSync,
} from '../services/BackgroundSyncTask';

interface SettingsScreenProps {
    navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps): JSX.Element {
    const { user, signOut } = useAuth();
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
        const baseUrl = environment === 'production'
            ? 'https://fitglue.tech'
            : environment === 'test'
                ? 'https://test.fitglue.tech'
                : 'https://dev.fitglue.tech';
        Linking.openURL(`${baseUrl}/app`);
    }, []);

    const handleOpenPrivacy = useCallback(() => {
        Linking.openURL('https://fitglue.tech/privacy');
    }, []);

    const handleOpenTerms = useCallback(() => {
        Linking.openURL('https://fitglue.tech/terms');
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

    const formatDate = (date: Date | null): string => {
        if (!date) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
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
                            <Text style={styles.settingDescription}>{formatDate(lastSync)}</Text>
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
        backgroundColor: '#0d0d0d',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 60,
    },
    backText: {
        color: '#FF006E',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1.5,
        marginBottom: 8,
        marginTop: 8,
    },
    card: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
    settingDescription: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    settingValue: {
        fontSize: 15,
        color: '#888',
    },
    settingDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginVertical: 8,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusGreen: {
        backgroundColor: '#22c55e',
    },
    statusAmber: {
        backgroundColor: '#f59e0b',
    },
    syncButton: {
        borderWidth: 1,
        borderColor: '#FF006E',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    syncButtonText: {
        color: '#FF006E',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    linkText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FF006E',
    },
    linkArrow: {
        fontSize: 16,
        color: '#FF006E',
    },
    signOutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    signOutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    titleFit: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF006E',
    },
    titleGlue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8338EC',
    },
    footerText: {
        fontSize: 12,
        color: '#555',
    },
});
