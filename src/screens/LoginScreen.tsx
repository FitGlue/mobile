/**
 * FitGlue Mobile Login Screen
 *
 * Allows users to sign in with their existing FitGlue credentials.
 * Registration is not available - users must register via the website.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { environment } from '../config/environment';

export function LoginScreen(): JSX.Element {
  const { signIn, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }

    clearError();
    await signIn(email.trim(), password);
  }, [email, password, signIn, clearError]);

  const handleRegisterLink = useCallback(() => {
    Linking.openURL('https://fitglue.tech/auth/register');
  }, []);

  const handleForgotPassword = useCallback(() => {
    Linking.openURL('https://fitglue.tech/auth/forgot-password');
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo and Title */}
        <View style={styles.header}>
          <Text style={styles.logo}>🔗</Text>
          <Text style={styles.title}>FitGlue</Text>
          <Text style={styles.subtitle}>Sign in to sync your workouts</Text>
        </View>

        {/* Environment Badge (dev/test only) */}
        {environment !== 'production' && (
          <View style={styles.envBadge}>
            <Text style={styles.envBadgeText}>
              {environment.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleRegisterLink}>
            <Text style={styles.registerLink}>Register at fitglue.tech</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark slate background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#14b8a6', // Teal
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8', // Slate 400
    textAlign: 'center',
  },
  envBadge: {
    alignSelf: 'center',
    backgroundColor: '#f59e0b', // Amber
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  envBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0', // Slate 200
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b', // Slate 800
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc', // Slate 50
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 64,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#14b8a6',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  registerText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  registerLink: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b', // Slate 500
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
