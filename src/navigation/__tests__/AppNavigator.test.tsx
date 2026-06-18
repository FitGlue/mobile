/**
 * Tests for the auth-aware AppNavigator. Navigation containers, screens, the
 * Sentry navigation integration and expo-notifications are mocked so we can
 * drive onboarding gating, the deep-link listener and onboarding completion
 * without a real navigator.
 */

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

jest.mock('../../screens', () => ({
  LoginScreen: () => null,
  OnboardingScreen: () => null,
}));
jest.mock('../../screens/ShowcaseModalScreen', () => ({ ShowcaseModalScreen: () => null }));
jest.mock('../../screens/MainScreen', () => ({
  MainScreen: () => null,
  mainWebViewRef: { current: { injectJavaScript: jest.fn() } },
}));
jest.mock('../../../App', () => ({
  navigationIntegration: { registerNavigationContainer: jest.fn() },
}));

const mockNavRef = { isReady: jest.fn(() => true), navigate: jest.fn() };
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children, onReady }: { children: React.ReactNode; onReady?: () => void }) => {
      React.useEffect(() => { onReady?.(); }, []);
      return React.createElement(React.Fragment, null, children);
    },
    createNavigationContainerRef: () => mockNavRef,
  };
});
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { navigationIntegration } from '../../../App';
import { mainWebViewRef } from '../../screens/MainScreen';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';

const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockRegisterNav = (navigationIntegration as unknown as { registerNavigationContainer: jest.Mock })
  .registerNavigationContainer;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockNavRef.isReady.mockReturnValue(true);
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('AppNavigator', () => {
  it('registers the navigation container once onboarding state resolves (authenticated)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);

    await waitFor(() => expect(mockRegisterNav).toHaveBeenCalled());
    expect(mockAddListener).toHaveBeenCalled();
  });

  it('stays on the loading screen while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    render(<AppNavigator />);
    // NavigationContainer (and thus registration) never renders while loading.
    expect(mockRegisterNav).not.toHaveBeenCalled();
  });

  it('navigates the WebView when a deep-link notification is tapped', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    const listener = mockAddListener.mock.calls[0][0] as (r: unknown) => void;
    act(() => {
      listener({ notification: { request: { content: { data: { screen: 'activity', id: 'act-9' } } } } });
    });

    expect(mockNavRef.navigate).toHaveBeenCalledWith('Main', {});

    act(() => { jest.advanceTimersByTime(600); });
    expect((mainWebViewRef.current as unknown as { injectJavaScript: jest.Mock }).injectJavaScript)
      .toHaveBeenCalledWith(expect.stringContaining('/activities/act-9'));
  });

  it('ignores deep-link notifications without screen or path', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    const listener = mockAddListener.mock.calls[0][0] as (r: unknown) => void;
    act(() => {
      listener({ notification: { request: { content: { data: {} } } } });
    });

    expect(mockNavRef.navigate).not.toHaveBeenCalled();
  });
});
