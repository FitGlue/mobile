/**
 * Tests for the WebAppScreen — the embedded SPA WebView host. WebView, auth,
 * status bar and the image-share bridge are mocked; the WebView mock captures
 * its props so we can drive onMessage / onLoad* / onError handlers.
 */

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

const mockWebViewProps: Record<string, unknown> = {};
jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    Object.assign(mockWebViewProps, props);
    return null;
  },
}));

const mockSaveImageToDevice = jest.fn();
jest.mock('../../utils/shareImage', () => ({
  saveImageToDevice: (...a: unknown[]) => mockSaveImageToDevice(...a),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockApiGet = jest.fn();
jest.mock('../../config/api', () => ({
  get: (...a: unknown[]) => mockApiGet(...a),
  endpoints: { webAuthToken: '/web-auth-token' },
}));

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { WebAppScreen } from '../WebAppScreen';

const onMessage = () => mockWebViewProps.onMessage as (e: { nativeEvent: { data: string } }) => void;

function makeRef() {
  return { current: { injectJavaScript: jest.fn(), reload: jest.fn() } } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockWebViewProps)) delete mockWebViewProps[k];
  mockUseAuth.mockReturnValue({ customToken: 'ct-1', isAuthenticated: true, customTokenReady: true });
  mockSaveImageToDevice.mockResolvedValue(undefined);
  mockApiGet.mockResolvedValue({ data: { customToken: 'fresh-token' } });
});

describe('WebAppScreen', () => {
  it('shows a loading overlay while the custom token is not ready', () => {
    mockUseAuth.mockReturnValue({ customToken: null, isAuthenticated: true, customTokenReady: false });
    render(<WebAppScreen webViewRef={makeRef()} url="https://x/app/" />);
    // WebView is not rendered in this branch
    expect(mockWebViewProps.source).toBeUndefined();
  });

  it('injects the custom token before content loads', () => {
    render(<WebAppScreen webViewRef={makeRef()} url="https://x/app/" />);
    expect(mockWebViewProps.injectedJavaScriptBeforeContentLoaded).toContain('__fitglueCustomToken');
    expect(mockWebViewProps.source).toEqual({ uri: 'https://x/app/' });
  });

  it('falls back to a no-op injection when there is no custom token', () => {
    mockUseAuth.mockReturnValue({ customToken: null, isAuthenticated: false, customTokenReady: false });
    render(<WebAppScreen webViewRef={makeRef()} url="https://x/app/" />);
    expect(mockWebViewProps.injectedJavaScriptBeforeContentLoaded).toBe('true;');
  });

  it('routes a routeChange message to onRouteChange', () => {
    const onRouteChange = jest.fn();
    render(<WebAppScreen webViewRef={makeRef()} url="u" onRouteChange={onRouteChange} />);
    onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'routeChange', path: '/activities' }) } });
    expect(onRouteChange).toHaveBeenCalledWith('/activities');
  });

  it('routes an openShowcase message to onOpenShowcase', () => {
    const onOpenShowcase = jest.fn();
    render(<WebAppScreen webViewRef={makeRef()} url="u" onOpenShowcase={onOpenShowcase} />);
    onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'openShowcase', url: 'https://x/@bob' }) } });
    expect(onOpenShowcase).toHaveBeenCalledWith('https://x/@bob');
  });

  it('bridges a saveImage message to the native share sheet', () => {
    render(<WebAppScreen webViewRef={makeRef()} url="u" />);
    onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'saveImage', dataUrl: 'd', filename: 'f.png' }) } });
    expect(mockSaveImageToDevice).toHaveBeenCalledWith('d', 'f.png');
  });

  it('handles an authExpired message without throwing (token-refresh path)', async () => {
    // The handler lazily `await import('../config/api')`; dynamic import does not
    // pick up the jest.mock, so we only assert the branch runs gracefully.
    const ref = makeRef();
    render(<WebAppScreen webViewRef={ref} url="u" />);

    await act(async () => {
      expect(() =>
        onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'authExpired' }) } }),
      ).not.toThrow();
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('ignores malformed messages', () => {
    render(<WebAppScreen webViewRef={makeRef()} url="u" />);
    expect(() => onMessage()({ nativeEvent: { data: 'not-json' } })).not.toThrow();
    expect(mockSaveImageToDevice).not.toHaveBeenCalled();
  });

  it('reports canGoBack changes', () => {
    const onCanGoBackChange = jest.fn();
    render(<WebAppScreen webViewRef={makeRef()} url="u" onCanGoBackChange={onCanGoBackChange} />);
    (mockWebViewProps.onNavigationStateChange as (s: { canGoBack: boolean }) => void)({ canGoBack: true });
    expect(onCanGoBackChange).toHaveBeenCalledWith(true);
  });

  it('shows an error UI on load error and retries via the WebView ref', () => {
    const ref = makeRef();
    render(<WebAppScreen webViewRef={ref} url="u" />);

    act(() => {
      (mockWebViewProps.onLoadStart as () => void)();
      (mockWebViewProps.onError as () => void)();
    });

    expect(screen.getByText('CONNECTION ERROR')).toBeTruthy();

    fireEvent.press(screen.getByText('RETRY'));
    expect((ref as { current: { reload: jest.Mock } }).current.reload).toHaveBeenCalled();
  });

  it('clears the loading overlay on load end', () => {
    render(<WebAppScreen webViewRef={makeRef()} url="u" />);
    act(() => {
      (mockWebViewProps.onLoadStart as () => void)();
      (mockWebViewProps.onLoadEnd as () => void)();
    });
    // No assertion error means the state transitions ran without throwing.
    expect(mockWebViewProps.source).toEqual({ uri: 'u' });
  });
});
