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
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { environment } from './src/config/environment';

// Initialize Sentry navigation integration
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Initialize Sentry before anything else
Sentry.init({
  dsn: 'https://5e198f53e86915f829ceb8c9d0621c33@o4510752869318656.ingest.de.sentry.io/4510902592274512',
  environment,
  release: Constants.expoConfig?.version ?? '1.0.0',
  integrations: [navigationIntegration],
  tracesSampleRate: environment === 'production' ? 0.2 : 1.0,
  enabled: environment !== 'development',
});

export { navigationIntegration };

// Catch unhandled promise rejections (e.g. native module crashes)
// so they log instead of silently killing the app
const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();

if ((global as any).ErrorUtils) {
  (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error(`[FitGlue] ${isFatal ? 'FATAL' : 'ERROR'}:`, error);
    Sentry.captureException(error, { tags: { fatal: String(!!isFatal) } });
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Suppress known non-actionable warnings in dev
LogBox.ignoreLogs(['react-native-health-connect']);

function App(): JSX.Element {
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

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
