import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { useWebViewBridge } from '../hooks/useWebViewBridge';
import { registerTabNav, unregisterTabNav } from '../navigation/webViewRegistry';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, spacing } from '../theme';

interface WebAppScreenProps {
  url: string;
  tabName?: string;
}

export function WebAppScreen({ url, tabName }: WebAppScreenProps): JSX.Element {
  const { customToken, isAuthenticated, customTokenReady } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Track whether the initial page load has finished. After that, onLoadStart
  // fires for every React Router pushState navigation on Android — we must NOT
  // show the overlay for those or it will spin forever (onLoadEnd never fires
  // for SPA navigations on Android WebView).
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const { webViewRef, canGoBack, setCanGoBack, isLoading, setIsLoading, hasError, setHasError, navigate: bridgeNavigate, handleMessage } =
    useWebViewBridge({
      onOpenShowcase: (showcaseUrl) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.getParent() as any)?.navigate('ShowcaseModal', { url: showcaseUrl });
      },
      onAuthExpired: async () => {
        // Re-fetch a fresh custom token and call window.__fg.refreshAuth() in the WebView
        try {
          const { get, endpoints } = await import('../config/api');
          const res = await get<{ customToken: string }>(endpoints.webAuthToken);
          if (res.data?.customToken) {
            const safeToken = JSON.stringify(res.data.customToken);
            webViewRef.current?.injectJavaScript(
              `window.__fg && window.__fg.refreshAuth(${safeToken}); true;`
            );
          }
        } catch { /* non-fatal */ }
      },
    });

  // Register this WebView's navigate function in the global registry so
  // AppNavigator can drive WebView navigation from push notification taps.
  useEffect(() => {
    if (tabName) {
      registerTabNav(tabName, bridgeNavigate);
      return () => unregisterTabNav(tabName);
    }
  }, [tabName, bridgeNavigate]);

  // Handle Android hardware back button — navigate the WebView back if possible
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBack = () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [canGoBack, webViewRef])
  );

  // Wait until the /web-auth-token fetch has settled (success or failure) before
  // mounting the WebView. If we mount before customTokenReady, the fetch is still
  // in-flight and injectedJavaScriptBeforeContentLoaded fires with no token.
  // If the fetch failed (server not yet deployed, network error, etc.) customToken
  // will be null but customTokenReady will be true — we load the WebView anyway
  // rather than spinning forever.
  if (isAuthenticated && !customTokenReady) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.pink} />
        </View>
      </View>
    );
  }

  const injectedJS = customToken
    ? `window.__fitglueCustomToken = ${JSON.stringify(customToken)}; true;`
    : 'true;';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onMessage={handleMessage}
        onLoadStart={() => { if (!hasInitiallyLoaded) setIsLoading(true); setHasError(false); }}
        onLoadEnd={() => { setIsLoading(false); setHasInitiallyLoaded(true); }}
        onError={() => { setIsLoading(false); setHasError(true); }}
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        // Prevent pinch-to-zoom on Android
        scalesPageToFit={false}
        setSupportMultipleWindows={false}
        style={styles.webView}
      />

      {isLoading && !hasError && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.pink} />
        </View>
      )}

      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>CONNECTION ERROR</Text>
          <Text style={styles.errorBody}>Could not load FitGlue. Check your connection.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setHasInitiallyLoaded(false);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryLabel}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.ink,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.rose,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.pink,
  },
  retryLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.pink,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
