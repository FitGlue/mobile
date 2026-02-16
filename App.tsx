/**
 * FitGlue Mobile App
 *
 * React Native app with iOS HealthKit and Android Health Connect integration.
 * Uses Firebase Auth for authentication.
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, LogBox } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Catch unhandled promise rejections (e.g. native module crashes)
// so they log instead of silently killing the app
const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();

if ((global as any).ErrorUtils) {
  (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error(`[FitGlue] ${isFatal ? 'FATAL' : 'ERROR'}:`, error);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Suppress known non-actionable warnings in dev
LogBox.ignoreLogs(['react-native-health-connect']);

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
