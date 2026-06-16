import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { colors, spacing } from '../theme';
import { saveImageToDevice } from '../utils/shareImage';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface ShowcaseModalScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ShowcaseModal'>;
  route: RouteProp<RootStackParamList, 'ShowcaseModal'>;
}

export function ShowcaseModalScreen({ navigation, route }: ShowcaseModalScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const { url } = route.params;

  // Showcase "share/download" buttons bridge image bytes to native (the Web
  // Share API / `<a download>` don't work in the WebView). Hand them to the
  // OS share sheet.
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        dataUrl?: string;
        filename?: string;
      };
      if (msg.type === 'saveImage' && msg.dataUrl && msg.filename) {
        saveImageToDevice(msg.dataUrl, msg.filename).catch(() => {
          // non-fatal: user dismissed the share sheet or save failed
        });
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SHOWCASE</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeLabel}>CLOSE ✕</Text>
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: url }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.paper,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  closeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  webView: {
    flex: 1,
    backgroundColor: colors.ink,
  },
});
