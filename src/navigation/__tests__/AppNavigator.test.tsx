/**
 * Tests for the auth-aware AppNavigator. Navigation containers, screens, the
 * Sentry navigation integration and expo-notifications are mocked so we can
 * drive onboarding gating, the deep-link handling (cold + warm start) and
 * onboarding completion without a real navigator.
 */

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

jest.mock('../../screens', () => ({
  LoginScreen: () => null,
  OnboardingScreen: () => null,
}));
jest.mock('../../screens/ShowcaseModalScreen', () => ({ ShowcaseModalScreen: () => null }));

// MainScreen is rendered via a render-prop; capture the deep-link props it
// receives so we can assert the resolved path is handed down to it.
const mockMainScreenProps: Record<string, unknown> = {};
jest.mock('../../screens/MainScreen', () => ({
  MainScreen: (props: Record<string, unknown>) => {
    Object.assign(mockMainScreenProps, props);
    return null;
  },
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
      // Render whichever screen wiring is used: a render-prop child (Main /
      // Onboarding) or a `component` (Login / ShowcaseModal).
      Screen: ({ children, component: C }: { children?: () => React.ReactNode; component?: React.ComponentType }) => {
        if (typeof children === 'function') return children();
        if (C) return React.createElement(C);
        return null;
      },
    }),
  };
});

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { navigationIntegration } from '../../../App';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';

const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetLastResponse = Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockRegisterNav = (navigationIntegration as unknown as { registerNavigationContainer: jest.Mock })
  .registerNavigationContainer;

function responseFor(data: Record<string, unknown>) {
  return { notification: { request: { content: { data } } } };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  for (const k of Object.keys(mockMainScreenProps)) delete mockMainScreenProps[k];
  mockNavRef.isReady.mockReturnValue(true);
  mockGetLastResponse.mockResolvedValue(null);
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

  it('hands the resolved deep-link path to MainScreen when a notification is tapped (warm start)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    const listener = mockAddListener.mock.calls[0][0] as (r: unknown) => void;
    act(() => {
      listener(responseFor({ screen: 'activity', id: 'act-9' }));
    });

    expect(mockNavRef.navigate).toHaveBeenCalledWith('Main', {});
    expect(mockMainScreenProps.deepLinkPath).toBe('/activities/act-9');
  });

  it('hands a cold-start deep link (getLastNotificationResponseAsync) to MainScreen', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');
    mockGetLastResponse.mockResolvedValue(responseFor({ screen: 'pipeline', id: 'p1' }));

    render(<AppNavigator />);

    await waitFor(() => expect(mockMainScreenProps.deepLinkPath).toBe('/settings/pipelines/p1'));
  });

  it('does not navigate when there is no last notification response (normal cold start)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);

    await waitFor(() => expect(mockRegisterNav).toHaveBeenCalled());
    expect(mockMainScreenProps.deepLinkPath).toBeNull();
  });

  it('ignores deep-link notifications without screen or path', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    await AsyncStorage.setItem('@fitglue/onboarding_complete', 'true');

    render(<AppNavigator />);
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    const listener = mockAddListener.mock.calls[0][0] as (r: unknown) => void;
    act(() => {
      listener(responseFor({}));
    });

    expect(mockNavRef.navigate).not.toHaveBeenCalled();
    expect(mockMainScreenProps.deepLinkPath).toBeNull();
  });
});
