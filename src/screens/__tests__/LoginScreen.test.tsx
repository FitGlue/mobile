/**
 * Tests for the LoginScreen form. Auth, haptics, gradient, status bar and
 * Linking are mocked.
 */

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
const mockImpactAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockImpactAsync(...a),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('../../config/environment', () => ({ environment: 'development' }));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import { Alert, Linking } from 'react-native';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

const mockSignIn = jest.fn();
const mockClearError = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    signIn: mockSignIn,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  });
  mockSignIn.mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});
afterEach(() => jest.restoreAllMocks());

describe('LoginScreen', () => {
  it('renders the sign-in form', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('alerts when email is missing', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('LOGIN →'));
    expect(Alert.alert).toHaveBeenCalledWith('Email Required', expect.any(String));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('alerts when password is missing', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('LOGIN →'));
    expect(Alert.alert).toHaveBeenCalledWith('Password Required', expect.any(String));
  });

  it('signs in with trimmed credentials', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '  a@b.com  ');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret');
    fireEvent.press(screen.getByText('LOGIN →'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'secret'));
    expect(mockClearError).toHaveBeenCalled();
    expect(mockImpactAsync).toHaveBeenCalled();
  });

  it('shows an error message (upper-cased) from auth state', () => {
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearError,
    });
    render(<LoginScreen />);
    expect(screen.getByText('INVALID CREDENTIALS')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    render(<LoginScreen />);
    const pw = screen.getByPlaceholderText('••••••••');
    expect(pw.props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByText('SHOW'));
    expect(screen.getByPlaceholderText('••••••••').props.secureTextEntry).toBe(false);
  });

  it('opens the register and forgot-password links on the web', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('REGISTER AT FITGLUE.TECH →'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://fitglue.tech/auth/register');
    fireEvent.press(screen.getByText('FORGOT PASSWORD →'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://fitglue.tech/auth/forgot-password');
  });
});
