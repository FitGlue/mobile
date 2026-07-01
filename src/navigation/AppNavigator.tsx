import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { LoginScreen, OnboardingScreen } from '../screens';
import { ShowcaseModalScreen } from '../screens/ShowcaseModalScreen';
import { MainScreen } from '../screens/MainScreen';
import { navigationIntegration } from '../../App';
import { resolveDeepLinkPath, type NotificationDeepLinkData } from './deepLink';

const ONBOARDING_COMPLETE_KEY = '@fitglue/onboarding_complete';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  ShowcaseModal: { url: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen(): JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF3DA6" />
    </View>
  );
}

export function AppNavigator(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [deepLinkPath, setDeepLinkPath] = useState<string | null>(null);
  // Stable across renders — a fresh ref each render would leave the effect
  // closures (and isReady checks) pointing at a container that never attaches.
  const navigationRef = useMemo(() => createNavigationContainerRef<RootStackParamList>(), []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  // Resolve a notification's deep-link target and hand it to MainScreen, which
  // owns the WebView and can apply it reliably (baked into the initial URL on a
  // cold start, or injected once the SPA has loaded on a warm one). We also
  // surface the Main screen so a tap dismisses any modal that was on top.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        | NotificationDeepLinkData
        | undefined;
      const webPath = resolveDeepLinkPath(data);
      if (!webPath) return;

      if (navigationRef.isReady()) {
        navigationRef.navigate('Main', {} as never);
      }
      setDeepLinkPath(webPath);
    },
    [navigationRef]
  );

  // Cold start: a notification tap that launched the (killed) app is delivered
  // here, not through the listener below.
  useEffect(() => {
    let cancelled = false;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!cancelled) handleNotificationResponse(response);
    });
    return () => { cancelled = true; };
  }, [handleNotificationResponse]);

  // Warm start: tap while the app is foregrounded or backgrounded-but-alive.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, [handleNotificationResponse]);

  const handleDeepLinkConsumed = useCallback(() => setDeepLinkPath(null), []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

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
          <>
            <Stack.Screen name="Main">
              {() => (
                <MainScreen
                  deepLinkPath={deepLinkPath}
                  onDeepLinkConsumed={handleDeepLinkConsumed}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="ShowcaseModal"
              component={ShowcaseModalScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        ) : hasSeenOnboarding ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
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
