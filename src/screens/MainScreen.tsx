import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

// Paths are relative to the web app's React Router basename (/app).
// window.__fg.navigate() calls React Router's navigate(), which takes
// paths relative to the basename — NOT the full URL path.
const TAB_PATHS: Record<Exclude<ActiveTab, 'sync'>, string> = {
  dash: '/',
  activities: '/activities',
  pipelines: '/settings/pipelines',
};

// routeChange postMessages from the web app also use basename-relative paths.
function pathToTab(path: string): ActiveTab | null {
  if (!path || path === '/') return 'dash';
  if (path.startsWith('/activities')) return 'activities';
  if (path.startsWith('/settings/pipelines') || path.startsWith('/inputs')) return 'pipelines';
  if (path.startsWith('/recipes')) return 'dash';
  return null;
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
        />
        {syncVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <SyncScreen />
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
