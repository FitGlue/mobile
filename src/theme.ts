/**
 * FitGlue Mobile Design Tokens — Brutal × Aurora
 *
 * Single source of truth for colors, spacing, typography, and radii.
 * Import from here instead of hard-coding values in StyleSheet.create().
 *
 * Palette:
 *   Background: #0A0A0F (midnight)
 *   Ink levels: #0F0F17 (ink-2), #141420 (ink-3)
 *   Aurora: pink #FF3DA6, violet #8B5CF6, cyan #22D3EE
 *   Paper (light): #F5F4EF
 *   Text primary: #F5F4EF, secondary: rgba(245,244,239,0.65)
 */

export const colors = {
    // BA Palette — base
    ink: '#0A0A0F',          // midnight background
    ink2: '#0F0F17',         // card surface
    ink3: '#141420',         // elevated card / chip bg
    paper: '#F5F4EF',        // primary text / light elements

    // Aurora accent trio
    pink: '#FF3DA6',         // aurora pink (was #FF006E)
    violet: '#8B5CF6',       // aurora violet (was #8338EC)
    cyan: '#22D3EE',         // aurora cyan (new)

    // Status / semantic
    green: '#22D3EE',        // OK indicator (cyan stands in for green in BA)
    rose: '#FF3DA6',         // FAILED / error indicator
    warning: '#F59E0B',      // amber warning (unchanged)

    // Legacy aliases (kept for backward compat in screens that use them)
    primary: '#FF3DA6',
    secondary: '#8B5CF6',
    background: '#0A0A0F',
    surface: '#0F0F17',
    surfaceBorder: 'rgba(245,244,239,0.08)',

    // Text
    textPrimary: '#F5F4EF',
    textSecondary: 'rgba(245,244,239,0.65)',
    textMuted: 'rgba(245,244,239,0.45)',
    textDim: 'rgba(245,244,239,0.30)',
    textSubtle: 'rgba(245,244,239,0.20)',

    // Status
    success: '#22D3EE',
    error: '#FF3DA6',
    errorSurface: 'rgba(255,61,166,0.10)',
    errorBorder: 'rgba(255,61,166,0.25)',

    // Hairline / dividers
    hairline: 'rgba(245,244,239,0.10)',
    divider: 'rgba(245,244,239,0.10)',
    dividerSubtle: 'rgba(245,244,239,0.06)',

    // Surfaces
    primarySurface: 'rgba(255,61,166,0.12)',
    primarySurfaceLight: 'rgba(255,61,166,0.06)',
    primaryTrack: 'rgba(255,61,166,0.4)',
    secondarySurface: 'rgba(139,92,246,0.10)',
    successSurface: 'rgba(34,211,238,0.12)',

    // Data pills
    pillBackground: 'rgba(245,244,239,0.06)',
    pillBorder: 'rgba(245,244,239,0.10)',

    // HR chart zones (BA tones)
    hrZoneLow: '#22D3EE',
    hrZoneMod: '#8B5CF6',
    hrZoneHigh: '#FF3DA6',
    hrZoneMax: '#FF3DA6',

    // Route
    routeLine: '#FF3DA6',
    routeStart: '#22D3EE',
    routeEnd: '#FF3DA6',

    // Controls
    thumbActive: '#FF3DA6',
    thumbInactive: 'rgba(245,244,239,0.25)',
    trackInactive: 'rgba(245,244,239,0.12)',
    overlay: 'rgba(245,244,239,0.06)',
} as const;

export const gradients = {
    // Full aurora: pink → violet → cyan
    primary: ['#FF3DA6', '#8B5CF6', '#22D3EE'] as const,
    // Subtle surface wash
    primarySurface: ['rgba(255,61,166,0.08)', 'rgba(139,92,246,0.08)'] as const,
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

// BA: no border-radius except avatars (round) and pill tags (4px max)
export const radii = {
    sm: 4,   // pills / tags max
    md: 0,   // cards — square in BA
    lg: 0,   // cards — square in BA
    xl: 0,   // cards — square in BA
    xxl: 0,  // cards — square in BA
    round: 9999, // avatars only
} as const;

export const typography = {
    // Display / heading — uppercase, heavy weight (simulates Archivo Black)
    titleLg: {
        fontSize: 32,
        fontWeight: '900' as const,
        color: colors.textPrimary,
        textTransform: 'uppercase' as const,
        letterSpacing: -0.5,
    },
    titleMd: {
        fontSize: 24,
        fontWeight: '900' as const,
        color: colors.textPrimary,
        textTransform: 'uppercase' as const,
        letterSpacing: -0.3,
    },
    titleSm: {
        fontSize: 18,
        fontWeight: '900' as const,
        color: colors.textPrimary,
        textTransform: 'uppercase' as const,
        letterSpacing: 0,
    },
    // Body — comfortable reading
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 15,
        fontWeight: '600' as const,
        color: colors.textPrimary,
    },
    // Mono label — simulates JetBrains Mono
    caption: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase' as const,
    },
    label: {
        fontSize: 9,
        fontWeight: '700' as const,
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
    },
    // Button
    button: {
        fontSize: 14,
        fontWeight: '900' as const,
        color: colors.ink,
        textTransform: 'uppercase' as const,
        letterSpacing: 1.5,
    },
    buttonSmall: {
        fontSize: 11,
        fontWeight: '700' as const,
        fontFamily: 'monospace',
        textTransform: 'uppercase' as const,
        letterSpacing: 1.5,
    },
} as const;
