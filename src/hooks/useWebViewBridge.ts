import { useRef, useState, useCallback } from 'react';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

export interface WebViewBridgeMessage {
  type: 'routeChange' | 'openShowcase' | 'ready' | 'authExpired';
  path?: string;
  url?: string;
}

export interface WebViewBridgeOptions {
  onRouteChange?: (path: string) => void;
  onOpenShowcase?: (url: string) => void;
  onReady?: () => void;
}

export function useWebViewBridge(options: WebViewBridgeOptions = {}) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const navigate = useCallback((path: string) => {
    // Strip characters that could break the JS string literal
    const safePath = path.replace(/['"`\\]/g, '');
    webViewRef.current?.injectJavaScript(
      `window.__fg && window.__fg.navigate('${safePath}'); true;`
    );
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as WebViewBridgeMessage;
      switch (msg.type) {
        case 'routeChange':
          if (msg.path) options.onRouteChange?.(msg.path);
          break;
        case 'openShowcase':
          if (msg.url) options.onOpenShowcase?.(msg.url);
          break;
        case 'ready':
          options.onReady?.();
          break;
      }
    } catch {
      // ignore malformed messages
    }
  }, [options.onRouteChange, options.onOpenShowcase, options.onReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    webViewRef,
    canGoBack,
    setCanGoBack,
    isLoading,
    setIsLoading,
    hasError,
    setHasError,
    navigate,
    handleMessage,
  };
}
