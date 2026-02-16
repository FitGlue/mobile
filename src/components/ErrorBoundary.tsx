/**
 * Global Error Boundary
 *
 * Catches unhandled JS errors and renders a recovery UI
 * instead of crashing the entire app.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Clipboard } from 'react-native';

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
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    handleCopyError = (): void => {
        const { error } = this.state;
        if (error) {
            const errorText = `${error.name}: ${error.message}\n\n${error.stack || 'No stack trace'}`;
            Clipboard.setString(errorText);
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
        backgroundColor: '#0d0d0d',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    message: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    button: {
        backgroundColor: '#FF006E',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    copyButton: {
        borderColor: '#FF006E',
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
    },
    copyButtonText: {
        color: '#FF006E',
        fontSize: 16,
        fontWeight: '600',
    },
    debugBox: {
        maxHeight: 200,
        width: '100%',
        backgroundColor: 'rgba(255, 0, 110, 0.08)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 110, 0.2)',
        padding: 12,
        marginBottom: 24,
    },
    debugLabel: {
        color: '#FF006E',
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
