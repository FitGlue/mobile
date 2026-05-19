/**
 * FitGlue Mobile Login Screen — Brutal × Aurora
 *
 * Aurora brand panel at top + auth form below.
 * No border-radius on inputs or cards (BA rule).
 * Registration links redirect to web.
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { environment } from '../config/environment';
import { colors, gradients, spacing } from '../theme';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        {/* Aurora brand panel */}
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.brandPanel}
        >
          <Text style={styles.brandWordmark}>FITGLUE</Text>
          <Text style={styles.brandTagline}>YOUR FITNESS APPS, FINALLY TALKING.</Text>
        </LinearGradient>

        {/* Environment badge (dev/test only) */}
        {environment !== 'production' && (
          <View style={styles.envBadge}>
            <Text style={styles.envBadgeText}>{environment.toUpperCase()}</Text>
          </View>
        )}

        {/* Auth form panel */}
        <View style={styles.formPanel}>
          {/* Panel header band */}
          <View style={styles.formBand}>
            <Text style={styles.formBandTitle}>SIGN IN</Text>
            <Text style={styles.formBandRight}>EXISTING ACCOUNT</Text>
          </View>

          <View style={styles.formBody}>
            {/* Error message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error.toUpperCase()}</Text>
              </View>
            )}

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showHideButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showHideText}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotText}>FORGOT PASSWORD →</Text>
            </TouchableOpacity>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitWrapper, isLoading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Text style={styles.submitText}>LOGIN →</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>DON'T HAVE AN ACCOUNT?</Text>
          <TouchableOpacity onPress={handleRegisterLink}>
            <Text style={styles.registerLink}>REGISTER AT FITGLUE.TECH →</Text>
          </TouchableOpacity>
        </View>

        {/* Legal footer */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://fitglue.tech/terms')}>
            <Text style={styles.legalLink}>TERMS</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://fitglue.tech/privacy')}>
            <Text style={styles.legalLink}>PRIVACY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Aurora brand panel
  brandPanel: {
    paddingTop: 72,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  brandWordmark: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: -1,
    lineHeight: 50,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.7,
    marginTop: 6,
  },
  // Environment badge
  envBadge: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.violet,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  envBadgeText: {
    color: colors.violet,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Form panel
  formPanel: {
    backgroundColor: colors.ink2,
    marginTop: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  formBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  formBandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.paper,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formBandRight: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  formBody: {
    padding: spacing.lg,
  },
  // Error box
  errorBox: {
    borderWidth: 1.5,
    borderColor: colors.rose,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.rose,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Field
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.ink3,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.paper,
    // No border-radius in BA
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 72,
  },
  showHideButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showHideText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.violet,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Forgot
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Submit button
  submitWrapper: {},
  submitButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Register
  registerRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 6,
  },
  registerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  registerLink: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.cyan,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Legal
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  legalLink: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSubtle,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  legalSep: {
    color: colors.textSubtle,
    fontSize: 12,
  },
});
