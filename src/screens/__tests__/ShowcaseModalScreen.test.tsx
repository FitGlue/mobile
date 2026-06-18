/**
 * Tests for the ShowcaseModalScreen. The WebView, safe-area hook and the native
 * image-share bridge are mocked. The WebView mock captures its props so we can
 * drive onMessage directly.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ShowcaseModalScreen } from '../ShowcaseModalScreen';

function setup() {
  const navigation = { goBack: jest.fn() } as never;
  const route = { params: { url: 'https://fitglue.tech/showcase/abc' } } as never;
  render(<ShowcaseModalScreen navigation={navigation} route={route} />);
  return { navigation, route };
}

const onMessage = () => mockWebViewProps.onMessage as (e: { nativeEvent: { data: string } }) => void;

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveImageToDevice.mockResolvedValue(undefined);
  for (const k of Object.keys(mockWebViewProps)) delete mockWebViewProps[k];
});

describe('ShowcaseModalScreen', () => {
  it('renders the header and loads the route url in the WebView', () => {
    setup();
    expect(screen.getByText('SHOWCASE')).toBeTruthy();
    expect(mockWebViewProps.source).toEqual({ uri: 'https://fitglue.tech/showcase/abc' });
  });

  it('goes back when CLOSE is pressed', () => {
    const { navigation } = setup();
    fireEvent.press(screen.getByText('CLOSE ✕'));
    expect((navigation as { goBack: jest.Mock }).goBack).toHaveBeenCalled();
  });

  it('bridges a saveImage message to the native share sheet', () => {
    setup();
    onMessage()({
      nativeEvent: { data: JSON.stringify({ type: 'saveImage', dataUrl: 'data:...', filename: 'r.png' }) },
    });
    expect(mockSaveImageToDevice).toHaveBeenCalledWith('data:...', 'r.png');
  });

  it('ignores saveImage messages missing dataUrl/filename', () => {
    setup();
    onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'saveImage' }) } });
    expect(mockSaveImageToDevice).not.toHaveBeenCalled();
  });

  it('ignores non-saveImage message types', () => {
    setup();
    onMessage()({ nativeEvent: { data: JSON.stringify({ type: 'analytics' }) } });
    expect(mockSaveImageToDevice).not.toHaveBeenCalled();
  });

  it('swallows malformed (non-JSON) messages', () => {
    setup();
    expect(() => onMessage()({ nativeEvent: { data: 'not json{' } })).not.toThrow();
    expect(mockSaveImageToDevice).not.toHaveBeenCalled();
  });

  it('does not throw when the native save rejects', () => {
    mockSaveImageToDevice.mockRejectedValue(new Error('dismissed'));
    setup();
    expect(() =>
      onMessage()({
        nativeEvent: { data: JSON.stringify({ type: 'saveImage', dataUrl: 'd', filename: 'f.png' }) },
      }),
    ).not.toThrow();
  });
});
