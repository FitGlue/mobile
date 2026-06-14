import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, BackHandler, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import WebView from 'react-native-webview';
import { BottomTabBar } from '../components/BottomTabBar';
import type { ActiveTab } from '../components/BottomTabBar';
import { SyncScreen } from './SyncScreen';
import { WebAppScreen } from './WebAppScreen';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { apiConfig } from '../config/environment';

// Module-level singleton — AppNavigator can inject navigation commands from
// push notification taps without needing React context.
export const mainWebViewRef = React.createRef<WebView>();

// Paths relative to the web app's React Router basename (/app).
const TAB_PATHS: Record<Exclude<ActiveTab, 'sync'>, string> = {
  dash: '/',
  activities: '/activities',
  pipelines: '/settings/pipelines',
};

// routeChange messages use basename-relative paths (no /app prefix).
// Settings, connections, and inputs all map to the pipelines tab (management area).
function pathToTab(path: string): ActiveTab | null {
  if (!path || path === '/') return 'dash';
  if (path.startsWith('/activities')) return 'activities';
  if (
    path.startsWith('/settings/pipelines') ||
    path.startsWith('/inputs')
  ) return 'pipelines';
  if (
    path.startsWith('/settings') ||
    path.startsWith('/connections')
  ) return 'pipelines';
  if (path.startsWith('/recipes')) return 'dash';
  return null;
}

// Returns true if the URL should be handled as a showcase (opens in modal).
function isShowcaseUrl(url: string, baseUrl: string): boolean {
  return (
    url.startsWith(`${baseUrl}/showcase`) ||
    // /@slug/id and /@slug public profile pages
    /^https?:\/\/[^/]+\/@[^/]/.test(url)
  );
}

export function MainScreen(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dash');
  const [syncVisible, setSyncVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const handleRouteChange = useCallback((path: string) => {
    const tab = pathToTab(path);
    if (tab !== null) {
      setActiveTab(tab);
      setSyncVisible(false);
    }
  }, []);

  const handleTabPress = useCallback((tab: ActiveTab) => {
    if (tab === 'sync') {
      setSyncVisible(true);
      setActiveTab('sync');
      return;
    }
    setSyncVisible(false);
    setActiveTab(tab);
    const safe = TAB_PATHS[tab].replace(/['"`\\]/g, '');
    mainWebViewRef.current?.injectJavaScript(
      `window.__fg && window.__fg.navigate('${safe}'); true;`
    );
  }, []);

  const handleOpenShowcase = useCallback((url: string) => {
    navigation.navigate('ShowcaseModal', { url });
  }, [navigation]);

  // Inject a SPA navigation and hide sync overlay — used by SyncScreen settings shortcut.
  const handleSyncNavigate = useCallback((path: string) => {
    setSyncVisible(false);
    const tab = pathToTab(path);
    if (tab) setActiveTab(tab);
    const safe = path.replace(/['"`\\]/g, '');
    mainWebViewRef.current?.injectJavaScript(
      `window.__fg && window.__fg.navigate('${safe}'); true;`
    );
  }, []);

  // URL interception: showcase → modal, external → system browser, SPA → allow.
  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const { url } = request;
      const base = apiConfig.baseUrl;

      // Allow the SPA and all its sub-routes
      if (url.startsWith(`${base}/app`)) return true;

      // Showcase pages → open in dedicated modal (not the main WebView)
      if (isShowcaseUrl(url, base)) {
        handleOpenShowcase(url);
        return false;
      }

      // Everything else (external domains, marketing site, auth pages, OAuth flows)
      // → open in the system browser
      Linking.openURL(url).catch(() => {});
      return false;
    },
    [handleOpenShowcase]
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => {
        if (syncVisible) {
          setSyncVisible(false);
          setActiveTab('dash');
          return true;
        }
        if (canGoBack) {
          mainWebViewRef.current?.goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [syncVisible, canGoBack])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.webContainer}>
        <WebAppScreen
          webViewRef={mainWebViewRef}
          url={`${apiConfig.baseUrl}/app/`}
          onRouteChange={handleRouteChange}
          onOpenShowcase={handleOpenShowcase}
          onCanGoBackChange={setCanGoBack}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        />
        {syncVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <SyncScreen onNavigate={handleSyncNavigate} />
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
