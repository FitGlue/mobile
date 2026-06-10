/**
 * FitGlue Mobile App Navigator
 *
 * Auth-aware navigation that shows:
 * 1. Onboarding carousel (first launch)
 * 2. Login screen (unauthenticated)
 * 3. Home screen (authenticated)
 * 4. Settings screen (from home)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { LoginScreen, OnboardingScreen } from '../screens';
import { ShowcaseModalScreen } from '../screens/ShowcaseModalScreen';
import { TabNavigator } from './TabNavigator';
import { navigateTabWebView } from './webViewRegistry';
import { navigationIntegration } from '../../App';

const ONBOARDING_COMPLETE_KEY = '@fitglue/onboarding_complete';

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
  ShowcaseModal: { url: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading screen shown while checking auth/onboarding state
function LoadingScreen(): JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF3DA6" />
    </View>
  );
}

// Maps notification payload `screen` values to bottom tab names
const SCREEN_TO_TAB: Record<string, string> = {
  activity: 'Activities',
  activities: 'Activities',
  pipeline: 'Pipelines',
  pipelines: 'Pipelines',
  sync: 'Sync',
};

export function AppNavigator(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const navigationRef = createNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  // Push notification deep linking — navigate to correct tab when user taps a notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        id?: string;
        path?: string;
      };
      if (!data?.screen) return;

      const tab = SCREEN_TO_TAB[data.screen];
      if (!tab) return;

      // Navigate to the correct tab in the authenticated stack
      if (navigationRef.isReady()) {
        navigationRef.navigate('MainTabs', {} as never);
        // Give React Navigation a tick to settle then switch tab + drive WebView
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigationRef as any).navigate('MainTabs', { screen: tab });
          // If a specific path was provided (e.g. /activities/abc123), inject it
          const path = data.path ?? (data.id && tab !== 'Sync' ? `/${tab.toLowerCase()}/${data.id}` : null);
          if (path) {
            setTimeout(() => navigateTabWebView(tab, path), 300);
          }
        }, 100);
      }
    });
    return () => sub.remove();
  }, [navigationRef]);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

  // Show loading screen while checking auth or onboarding state
  if (isLoading || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        navigationIntegration.registerNavigationContainer(navigationRef);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          // Authenticated stack — tabs + modal screens above them
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="ShowcaseModal"
              component={ShowcaseModalScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        ) : hasSeenOnboarding ? (
          // Seen onboarding, show login
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // First launch — show onboarding
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
});
