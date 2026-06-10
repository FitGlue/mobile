import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { LoginScreen, OnboardingScreen } from '../screens';
import { ShowcaseModalScreen } from '../screens/ShowcaseModalScreen';
import { MainScreen, mainWebViewRef } from '../screens/MainScreen';
import { navigationIntegration } from '../../App';

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

// Maps notification payload `screen` values to SPA paths
const SCREEN_TO_PATH: Record<string, string> = {
  activity: '/app/activities',
  activities: '/app/activities',
  pipeline: '/app/settings/pipelines',
  pipelines: '/app/settings/pipelines',
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

  // Push notification deep linking
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        id?: string;
        path?: string;
      };
      if (!data?.screen) return;

      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Main', {} as never);

      const webPath = data.path
        ?? (data.id && data.screen !== 'sync' ? `${SCREEN_TO_PATH[data.screen]}/${data.id}` : null)
        ?? SCREEN_TO_PATH[data.screen]
        ?? null;

      if (webPath) {
        const safe = webPath.replace(/['"`\\]/g, '');
        setTimeout(() => {
          mainWebViewRef.current?.injectJavaScript(
            `window.__fg && window.__fg.navigate('${safe}'); true;`
          );
        }, 300);
      }
    });
    return () => sub.remove();
  }, [navigationRef]);

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
            <Stack.Screen name="Main" component={MainScreen} />
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
