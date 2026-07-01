import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, BackHandler, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import WebView from 'react-native-webview';
import { BottomTabBar } from '../components/BottomTabBar';
import type { ActiveTab } from '../components/BottomTabBar';
import { SyncScreen } from './SyncScreen';
import { MenuScreen } from './MenuScreen';
import { WebAppScreen } from './WebAppScreen';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { apiConfig } from '../config/environment';
import { buildNavigateScript, buildWebAppUrl } from '../navigation/deepLink';

export interface MainScreenProps {
  // A basename-relative SPA path (e.g. `/activities/act-9`) to deep-link into,
  // resolved from a push-notification tap. Null when there's no pending target.
  deepLinkPath?: string | null;
  // Called once the deep link has been applied so the owner can clear it and
  // allow the same target to be delivered again later.
  onDeepLinkConsumed?: () => void;
}

// Module-level singleton — AppNavigator can inject navigation commands from
// push notification taps without needing React context.
export const mainWebViewRef = React.createRef<WebView>();

// Paths relative to the web app's React Router basename (/app).
const TAB_PATHS: Record<Exclude<ActiveTab, 'sync' | 'more'>, string> = {
  dash: '/',
  activities: '/activities',
};

// routeChange messages use basename-relative paths (no /app prefix).
function pathToTab(path: string): ActiveTab | null {
  if (!path || path === '/') return 'dash';
  if (path.startsWith('/activities')) return 'activities';
  if (
    path.startsWith('/settings') ||
    path.startsWith('/connections') ||
    path.startsWith('/inputs') ||
    path.startsWith('/recipes')
  ) return 'more';
  return null;
}

// Returns true if the URL should be handled as a showcase (opens in modal).
function isShowcaseUrl(url: string, baseUrl: string): boolean {
  return (
    url.startsWith(`${baseUrl}/showcase`) ||
    /^https?:\/\/[^/]+\/@[^/]/.test(url)
  );
}

export function MainScreen({ deepLinkPath, onDeepLinkConsumed }: MainScreenProps = {}): JSX.Element {
  // Capture the deep link present at first mount so it can be baked straight
  // into the WebView's initial URL — this is the cold-start path where the SPA
  // isn't loaded yet, so injecting `window.__fg.navigate` would be a no-op.
  const initialPathRef = useRef(deepLinkPath ?? null);
  const initialConsumedRef = useRef(false);
  // Injection can only drive the router once the SPA has loaded and exposed
  // `window.__fg`. Queue any navigation that arrives before then.
  const webLoadedRef = useRef(false);
  const pendingPathRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    pathToTab(deepLinkPath ?? '/') ?? 'dash'
  );
  const [syncVisible, setSyncVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // Drive the SPA router to `path`, waiting for the web view to finish loading
  // if it hasn't yet (otherwise `window.__fg` is undefined and the call is lost).
  const navigateWeb = useCallback((path: string) => {
    if (webLoadedRef.current) {
      mainWebViewRef.current?.injectJavaScript(buildNavigateScript(path));
    } else {
      pendingPathRef.current = path;
    }
  }, []);

  const handleWebLoaded = useCallback(() => {
    webLoadedRef.current = true;
    const pending = pendingPathRef.current;
    if (pending) {
      pendingPathRef.current = null;
      mainWebViewRef.current?.injectJavaScript(buildNavigateScript(pending));
    }
  }, []);

  // React to deep links that arrive after mount (warm start), or a cold-start
  // link that resolved a tick too late to be baked into the initial URL.
  useEffect(() => {
    if (!deepLinkPath) return;
    // If this exact path was baked into the initial URL, the WebView is already
    // loading it — don't also inject a redundant navigation.
    if (!initialConsumedRef.current && deepLinkPath === initialPathRef.current) {
      initialConsumedRef.current = true;
      onDeepLinkConsumed?.();
      return;
    }
    setSyncVisible(false);
    setMenuVisible(false);
    const tab = pathToTab(deepLinkPath);
    if (tab) setActiveTab(tab);
    navigateWeb(deepLinkPath);
    onDeepLinkConsumed?.();
  }, [deepLinkPath, navigateWeb, onDeepLinkConsumed]);

  const handleRouteChange = useCallback((path: string) => {
    const tab = pathToTab(path);
    if (tab !== null) {
      setActiveTab(tab);
      setSyncVisible(false);
      setMenuVisible(false);
    }
  }, []);

  const handleTabPress = useCallback((tab: ActiveTab) => {
    if (tab === 'sync') {
      setMenuVisible(false);
      setSyncVisible(true);
      setActiveTab('sync');
      return;
    }
    if (tab === 'more') {
      setSyncVisible(false);
      setMenuVisible(true);
      setActiveTab('more');
      return;
    }
    setSyncVisible(false);
    setMenuVisible(false);
    setActiveTab(tab);
    mainWebViewRef.current?.injectJavaScript(buildNavigateScript(TAB_PATHS[tab]));
  }, []);

  const handleOpenShowcase = useCallback((url: string) => {
    navigation.navigate('ShowcaseModal', { url });
  }, [navigation]);

  // Navigate the SPA and close any native overlay.
  const handleOverlayNavigate = useCallback((path: string) => {
    setSyncVisible(false);
    setMenuVisible(false);
    const tab = pathToTab(path);
    if (tab) setActiveTab(tab);
    mainWebViewRef.current?.injectJavaScript(buildNavigateScript(path));
  }, []);

  // URL interception: showcase → modal, external → system browser, SPA → allow.
  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const { url } = request;
      const base = apiConfig.baseUrl;

      if (url.startsWith(`${base}/app`)) return true;

      if (isShowcaseUrl(url, base)) {
        handleOpenShowcase(url);
        return false;
      }

      Linking.openURL(url).catch(() => {});
      return false;
    },
    [handleOpenShowcase]
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => {
        if (syncVisible) { setSyncVisible(false); setActiveTab('dash'); return true; }
        if (menuVisible) { setMenuVisible(false); setActiveTab('dash'); return true; }
        if (canGoBack) { mainWebViewRef.current?.goBack(); return true; }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [syncVisible, menuVisible, canGoBack])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.webContainer}>
        <WebAppScreen
          webViewRef={mainWebViewRef}
          url={buildWebAppUrl(apiConfig.baseUrl, initialPathRef.current)}
          onRouteChange={handleRouteChange}
          onOpenShowcase={handleOpenShowcase}
          onCanGoBackChange={setCanGoBack}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadEnd={handleWebLoaded}
        />
        {syncVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <SyncScreen onNavigate={handleOverlayNavigate} />
          </View>
        )}
        {menuVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <MenuScreen onNavigate={handleOverlayNavigate} />
          </View>
        )}
      </View>
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  webContainer: {
    flex: 1,
  },
});
