import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { useAuth } from '../context/AuthContext';
import { saveImageToDevice } from '../utils/shareImage';
import { colors, spacing } from '../theme';

interface WebAppScreenProps {
  webViewRef: React.RefObject<WebView | null>;
  url: string;
  onRouteChange?: (path: string) => void;
  onOpenShowcase?: (url: string) => void;
  onCanGoBackChange?: (canGoBack: boolean) => void;
  onShouldStartLoadWithRequest?: (request: ShouldStartLoadRequest) => boolean;
  // Fires once the SPA has finished loading — the host uses this to flush any
  // deep-link navigation that arrived before `window.__fg` was available.
  onLoadEnd?: () => void;
}

export function WebAppScreen({
  webViewRef,
  url,
  onRouteChange,
  onOpenShowcase,
  onCanGoBackChange,
  onShouldStartLoadWithRequest,
  onLoadEnd,
}: WebAppScreenProps): JSX.Element {
  const { customToken, isAuthenticated, customTokenReady } = useAuth();

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        path?: string;
        url?: string;
        dataUrl?: string;
        filename?: string;
      };
      switch (msg.type) {
        case 'routeChange':
          if (msg.path) onRouteChange?.(msg.path);
          break;
        case 'openShowcase':
          if (msg.url) onOpenShowcase?.(msg.url);
          break;
        case 'saveImage':
          if (msg.dataUrl && msg.filename) {
            saveImageToDevice(msg.dataUrl, msg.filename).catch(() => {
              // non-fatal: user dismissed the share sheet or save failed
            });
          }
          break;
        case 'authExpired':
          // Re-fetch and push a fresh custom token into the WebView
          (async () => {
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
          })();
          break;
      }
    } catch { /* ignore malformed messages */ }
  }, [onRouteChange, onOpenShowcase, webViewRef]); // eslint-disable-line react-hooks/exhaustive-deps

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
        onLoadEnd={() => { setIsLoading(false); setHasInitiallyLoaded(true); onLoadEnd?.(); }}
        onError={() => { setIsLoading(false); setHasError(true); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={state => onCanGoBackChange?.(state.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
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
