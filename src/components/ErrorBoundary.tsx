/**
 * Global Error Boundary
 *
 * Catches unhandled JS errors and renders a recovery UI
 * instead of crashing the entire app.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sentry from '@sentry/react-native';
import { colors, spacing, radii, typography } from '../theme';

const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
        Sentry.captureException(error, {
            contexts: { react: { componentStack: errorInfo.componentStack } },
        });
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    handleCopyError = async (): Promise<void> => {
        const { error } = this.state;
        if (error) {
            const errorText = `${error.name}: ${error.message}\n\n${error.stack || 'No stack trace'}`;
            await Clipboard.setStringAsync(errorText);
        }
    };

    render(): ReactNode {
        if (this.state.hasError) {
            const { error } = this.state;
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        {error?.message || 'An unexpected error occurred.'}
                    </Text>

                    {!IS_PRODUCTION && error && (
                        <ScrollView style={styles.debugBox}>
                            <Text style={styles.debugLabel}>{error.name}</Text>
                            <Text style={styles.debugText}>{error.stack || 'No stack trace'}</Text>
                        </ScrollView>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                        {!IS_PRODUCTION && (
                            <TouchableOpacity style={styles.copyButton} onPress={this.handleCopyError}>
                                <Text style={styles.copyButtonText}>Copy Error</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxxl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.titleMd,
        marginBottom: spacing.md,
    },
    message: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xxxl,
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xxxl,
        paddingVertical: 14,
        borderRadius: radii.lg,
    },
    buttonText: {
        ...typography.button,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    copyButton: {
        borderColor: colors.primary,
        borderWidth: 1,
        paddingHorizontal: spacing.xxl,
        paddingVertical: 14,
        borderRadius: radii.lg,
    },
    copyButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    debugBox: {
        maxHeight: 200,
        width: '100%',
        backgroundColor: colors.primarySurfaceLight,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 110, 0.2)',
        padding: spacing.md,
        marginBottom: spacing.xxl,
    },
    debugLabel: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    debugText: {
        color: '#ccc',
        fontSize: 11,
        lineHeight: 16,
    },
});
