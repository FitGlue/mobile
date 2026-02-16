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
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LoginScreen, HomeScreen, OnboardingScreen, SettingsScreen } from '../screens';

const ONBOARDING_COMPLETE_KEY = '@fitglue/onboarding_complete';

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading screen shown while checking auth/onboarding state
function LoadingScreen(): JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF006E" />
    </View>
  );
}

export function AppNavigator(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

  // Show loading screen while checking auth or onboarding state
  if (isLoading || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0d0d0d' },
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          // Authenticated stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
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
    backgroundColor: '#0d0d0d',
  },
});
