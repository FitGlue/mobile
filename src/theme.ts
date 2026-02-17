/**
 * FitGlue Mobile Design Tokens
 *
 * Single source of truth for colors, spacing, typography, and radii.
 * Import from here instead of hard-coding values in StyleSheet.create().
 */

export const colors = {
    // Brand
    primary: '#FF006E',
    secondary: '#8338EC',

    // Backgrounds
    background: '#0d0d0d',
    surface: 'rgba(26, 26, 26, 0.9)',
    surfaceBorder: 'rgba(255, 255, 255, 0.1)',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#888888',
    textDim: '#666666',
    textSubtle: '#555555',

    // Status
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    errorSurface: 'rgba(239, 68, 68, 0.1)',
    errorBorder: 'rgba(239, 68, 68, 0.3)',

    // Brand surfaces
    primarySurface: 'rgba(255, 0, 110, 0.15)',
    primarySurfaceLight: 'rgba(255, 0, 110, 0.08)',
    primaryTrack: 'rgba(255, 0, 110, 0.4)',
    secondarySurface: 'rgba(131, 56, 236, 0.1)',
    successSurface: 'rgba(34, 197, 94, 0.15)',

    // Dividers
    divider: 'rgba(255, 255, 255, 0.1)',
    dividerSubtle: 'rgba(255, 255, 255, 0.06)',

    // Controls
    thumbActive: '#FF006E',
    thumbInactive: '#666666',
    trackInactive: '#333333',
    overlay: 'rgba(255, 255, 255, 0.08)',
} as const;

export const gradients = {
    primary: ['#FF006E', '#8338EC'] as const,
    primarySurface: ['rgba(255, 0, 110, 0.1)', 'rgba(131, 56, 236, 0.1)'] as const,
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const radii = {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 16,
    round: 9999,
} as const;

export const typography = {
    titleLg: {
        fontSize: 32,
        fontWeight: 'bold' as const,
        color: colors.textPrimary,
    },
    titleMd: {
        fontSize: 24,
        fontWeight: 'bold' as const,
        color: colors.textPrimary,
    },
    titleSm: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: colors.textPrimary,
    },
    body: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 15,
        fontWeight: '600' as const,
        color: colors.textPrimary,
    },
    caption: {
        fontSize: 13,
        color: colors.textMuted,
    },
    label: {
        fontSize: 12,
        fontWeight: '700' as const,
        color: colors.textDim,
        letterSpacing: 1.5,
    },
    button: {
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: colors.textPrimary,
    },
    buttonSmall: {
        fontSize: 14,
        fontWeight: '600' as const,
    },
} as const;
