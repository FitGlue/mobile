/**
 * Tests for MainScreen — the native tab shell wrapping the web SPA. Child
 * screens and navigation hooks are mocked; WebAppScreen + BottomTabBar mocks
 * capture their props so we can exercise the routing / tab / URL-interception
 * handlers.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../config/environment', () => ({ apiConfig: { baseUrl: 'https://app.test' } }));

const mockWebAppProps: Record<string, unknown> = {};
jest.mock('../WebAppScreen', () => ({
  WebAppScreen: (props: Record<string, unknown>) => {
    Object.assign(mockWebAppProps, props);
    return null;
  },
}));

const mockTabBarProps: Record<string, unknown> = {};
jest.mock('../../components/BottomTabBar', () => ({
  BottomTabBar: (props: Record<string, unknown>) => {
    Object.assign(mockTabBarProps, props);
    return null;
  },
}));

jest.mock('../SyncScreen', () => ({ SyncScreen: () => null }));
jest.mock('../MenuScreen', () => ({ MenuScreen: () => null }));

import { Linking } from 'react-native';
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { MainScreen, mainWebViewRef } from '../MainScreen';

const onTabPress = () => mockTabBarProps.onTabPress as (t: string) => void;
const shouldStart = () =>
  mockWebAppProps.onShouldStartLoadWithRequest as (r: { url: string }) => boolean;
const fireWebLoaded = () => (mockWebAppProps.onLoadEnd as () => void)();
const injectMock = () =>
  (mainWebViewRef.current as unknown as { injectJavaScript: jest.Mock }).injectJavaScript;

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockWebAppProps)) delete mockWebAppProps[k];
  for (const k of Object.keys(mockTabBarProps)) delete mockTabBarProps[k];
  // @ts-expect-error test injection of the singleton ref
  mainWebViewRef.current = { injectJavaScript: jest.fn(), goBack: jest.fn() };
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});
afterEach(() => jest.restoreAllMocks());

describe('MainScreen', () => {
  it('renders with the web app pointed at /app/ and a dash tab', () => {
    render(<MainScreen />);
    expect(mockWebAppProps.url).toBe('https://app.test/app/');
    expect(mockTabBarProps.activeTab).toBe('dash');
  });

  it('injects SPA navigation when a content tab is pressed', () => {
    render(<MainScreen />);
    act(() => onTabPress()('activities'));
    expect((mainWebViewRef.current as unknown as { injectJavaScript: jest.Mock }).injectJavaScript)
      .toHaveBeenCalledWith(expect.stringContaining('/activities'));
  });

  it('opens the sync overlay for the sync tab (no SPA navigation)', () => {
    render(<MainScreen />);
    act(() => onTabPress()('sync'));
    expect(mockTabBarProps.activeTab).toBe('sync');
  });

  it('opens the menu overlay for the more tab', () => {
    render(<MainScreen />);
    act(() => onTabPress()('more'));
    expect(mockTabBarProps.activeTab).toBe('more');
  });

  it('maps SPA route changes back onto the active tab', () => {
    render(<MainScreen />);
    act(() => (mockWebAppProps.onRouteChange as (p: string) => void)('/settings/account'));
    expect(mockTabBarProps.activeTab).toBe('more');
  });

  describe('deep linking', () => {
    it('bakes a cold-start deep link into the initial WebView URL (no injection race)', () => {
      const onDeepLinkConsumed = jest.fn();
      render(
        <MainScreen deepLinkPath="/activities/act-9" onDeepLinkConsumed={onDeepLinkConsumed} />,
      );
      // Loaded directly at the target — no dashboard flash, no post-load inject.
      expect(mockWebAppProps.url).toBe('https://app.test/app/activities/act-9');
      expect(mockTabBarProps.activeTab).toBe('activities');
      expect(injectMock()).not.toHaveBeenCalled();
      expect(onDeepLinkConsumed).toHaveBeenCalled();
    });

    it('injects navigation for a deep link that arrives after load (warm start)', () => {
      const onDeepLinkConsumed = jest.fn();
      const { rerender } = render(<MainScreen deepLinkPath={null} onDeepLinkConsumed={onDeepLinkConsumed} />);
      act(() => fireWebLoaded());

      rerender(<MainScreen deepLinkPath="/activities" onDeepLinkConsumed={onDeepLinkConsumed} />);

      expect(injectMock()).toHaveBeenCalledWith(expect.stringContaining('/activities'));
      expect(mockTabBarProps.activeTab).toBe('activities');
      expect(onDeepLinkConsumed).toHaveBeenCalled();
    });

    it('queues a deep link that arrives before load and flushes it on load end', () => {
      const { rerender } = render(<MainScreen deepLinkPath={null} />);

      // Arrives before the SPA has loaded — must not inject into a page without window.__fg.
      rerender(<MainScreen deepLinkPath="/settings/pipelines/p1" />);
      expect(injectMock()).not.toHaveBeenCalled();

      act(() => fireWebLoaded());
      expect(injectMock()).toHaveBeenCalledWith(expect.stringContaining('/settings/pipelines/p1'));
    });
  });

  describe('URL interception', () => {
    it('allows in-app /app URLs', () => {
      render(<MainScreen />);
      expect(shouldStart()({ url: 'https://app.test/app/activities' })).toBe(true);
    });

    it('routes showcase URLs to the modal and blocks the WebView load', () => {
      render(<MainScreen />);
      expect(shouldStart()({ url: 'https://app.test/showcase/abc' })).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith('ShowcaseModal', { url: 'https://app.test/showcase/abc' });
    });

    it('opens external URLs in the system browser and blocks the load', () => {
      render(<MainScreen />);
      expect(shouldStart()({ url: 'https://example.com/foo' })).toBe(false);
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/foo');
    });
  });
});
