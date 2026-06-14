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
import { MenuScreen } from './MenuScreen';
import { WebAppScreen } from './WebAppScreen';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { apiConfig } from '../config/environment';

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

export function MainScreen(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dash');
  const [syncVisible, setSyncVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

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
    const safe = TAB_PATHS[tab].replace(/['"`\\]/g, '');
    mainWebViewRef.current?.injectJavaScript(
      `window.__fg && window.__fg.navigate('${safe}'); true;`
    );
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
          url={`${apiConfig.baseUrl}/app/`}
          onRouteChange={handleRouteChange}
          onOpenShowcase={handleOpenShowcase}
          onCanGoBackChange={setCanGoBack}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
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
