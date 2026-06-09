import React, { useCallback } from 'react';
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
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, spacing } from '../theme';

interface WebAppScreenProps {
  url: string;
}

export function WebAppScreen({ url }: WebAppScreenProps): JSX.Element {
  const { customToken } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { webViewRef, canGoBack, setCanGoBack, isLoading, setIsLoading, hasError, setHasError, handleMessage } =
    useWebViewBridge({
      onOpenShowcase: (showcaseUrl) => {
        // Navigate to ShowcaseModal in the parent stack navigator.
        // Use 'as any' to cross navigator boundaries — ShowcaseModal lives in the root stack above tabs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.getParent() as any)?.navigate('ShowcaseModal', { url: showcaseUrl });
      },
    });

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

  // Inject custom token before content loads so web app can sign in without a second login
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
        onLoadStart={() => { setIsLoading(true); setHasError(false); }}
        onLoadEnd={() => setIsLoading(false)}
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
