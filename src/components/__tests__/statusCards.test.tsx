/**
 * Tests for SyncStatusCard and HealthStatusCard. expo-linear-gradient and
 * expo-haptics are mocked.
 */

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

const mockImpactAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockImpactAsync(...a),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SyncStatusCard } from '../SyncStatusCard';
import { HealthStatusCard } from '../HealthStatusCard';

beforeEach(() => jest.clearAllMocks());

describe('SyncStatusCard', () => {
  const baseProps = {
    lastSync: null,
    syncStatus: 'idle' as const,
    lastSyncResult: null,
    loading: false,
    onSyncNow: jest.fn(),
    onFetchWorkouts: jest.fn(),
  };

  it('shows NEVER and IDLE when there is no sync history', () => {
    render(<SyncStatusCard {...baseProps} />);
    expect(screen.getByText('NEVER')).toBeTruthy();
    expect(screen.getByText('IDLE')).toBeTruthy();
    expect(screen.getByText('SYNC NOW →')).toBeTruthy();
  });

  it('renders the last sync timestamp', () => {
    const lastSync = new Date('2026-01-02T10:00:00Z');
    render(<SyncStatusCard {...baseProps} lastSync={lastSync} />);
    expect(screen.getByText(lastSync.toLocaleString())).toBeTruthy();
  });

  it('shows the running banner while syncing and disables Sync Now', () => {
    render(<SyncStatusCard {...baseProps} syncStatus="syncing" />);
    expect(screen.getByText('RUNNING')).toBeTruthy();
    expect(screen.getByText('SYNCING WORKOUTS TO FITGLUE…')).toBeTruthy();
    expect(screen.getByText('SYNCING…')).toBeTruthy();
  });

  it('pluralises the processed count in the success banner', () => {
    render(
      <SyncStatusCard
        {...baseProps}
        syncStatus="success"
        lastSyncResult={{ success: true, processedCount: 2 }}
      />,
    );
    expect(screen.getByText('✓ SYNCED — 2 WORKOUTS PROCESSED')).toBeTruthy();
  });

  it('uses the singular form for a single processed workout', () => {
    render(
      <SyncStatusCard
        {...baseProps}
        syncStatus="success"
        lastSyncResult={{ success: true, processedCount: 1 }}
      />,
    );
    expect(screen.getByText('✓ SYNCED — 1 WORKOUT PROCESSED')).toBeTruthy();
  });

  it('shows the upper-cased error banner on failure', () => {
    render(
      <SyncStatusCard
        {...baseProps}
        syncStatus="error"
        lastSyncResult={{ success: false, processedCount: 0, error: 'timeout' }}
      />,
    );
    expect(screen.getByText('TIMEOUT')).toBeTruthy();
    expect(screen.getByText('FAILED')).toBeTruthy();
  });

  it('invokes the callbacks (with haptics for fetch)', () => {
    const onSyncNow = jest.fn();
    const onFetchWorkouts = jest.fn();
    render(<SyncStatusCard {...baseProps} onSyncNow={onSyncNow} onFetchWorkouts={onFetchWorkouts} />);

    fireEvent.press(screen.getByText('SYNC NOW →'));
    expect(onSyncNow).toHaveBeenCalled();

    fireEvent.press(screen.getByText('BROWSE DEVICE WORKOUTS — LAST 30 DAYS →'));
    expect(mockImpactAsync).toHaveBeenCalled();
    expect(onFetchWorkouts).toHaveBeenCalled();
  });

  it('shows FETCHING… while loading device workouts', () => {
    render(<SyncStatusCard {...baseProps} loading={true} />);
    expect(screen.getByText('FETCHING…')).toBeTruthy();
  });
});

describe('HealthStatusCard', () => {
  const baseProps = {
    isAvailable: true,
    isInitialized: false,
    permissions: { workouts: false, heartRate: false },
    connectionStatus: 'idle' as const,
    healthError: null,
    loading: false,
    onInitialize: jest.fn(),
  };

  it('prompts to connect when not initialised', () => {
    render(<HealthStatusCard {...baseProps} />);
    expect(screen.getByText('SETUP REQUIRED')).toBeTruthy();
    expect(screen.getByText(/CONNECT APPLE HEALTHKIT/)).toBeTruthy();
  });

  it('hides the connect button and shows connected state when initialised', () => {
    render(<HealthStatusCard {...baseProps} isInitialized={true} />);
    expect(screen.getByText('CONNECTED')).toBeTruthy();
    expect(screen.getByText('Your health data is connected and ready to sync.')).toBeTruthy();
    expect(screen.queryByText(/CONNECT APPLE HEALTHKIT/)).toBeNull();
  });

  it('shows an error box with a retry button when health errors out', () => {
    const onInitialize = jest.fn();
    render(<HealthStatusCard {...baseProps} healthError="permission denied" onInitialize={onInitialize} />);

    expect(screen.getByText('⚠ CONNECTION ISSUE')).toBeTruthy();
    expect(screen.getByText('permission denied')).toBeTruthy();

    fireEvent.press(screen.getByText('RETRY CONNECTION →'));
    expect(mockImpactAsync).toHaveBeenCalled();
    expect(onInitialize).toHaveBeenCalled();
  });

  it('shows the connecting banner', () => {
    render(<HealthStatusCard {...baseProps} connectionStatus="connecting" />);
    expect(screen.getByText(/ENABLING APPLE HEALTHKIT/)).toBeTruthy();
  });

  it('shows the connected banner', () => {
    render(<HealthStatusCard {...baseProps} connectionStatus="connected" />);
    expect(screen.getByText(/✓ ENABLED — APPLE HEALTHKIT AS SOURCE/)).toBeTruthy();
  });

  it('shows the registration-failed banner', () => {
    render(<HealthStatusCard {...baseProps} connectionStatus="error" />);
    expect(screen.getByText('FAILED TO REGISTER — SYNC WILL STILL WORK')).toBeTruthy();
  });

  it('fires onInitialize from the connect button', () => {
    const onInitialize = jest.fn();
    render(<HealthStatusCard {...baseProps} onInitialize={onInitialize} />);
    fireEvent.press(screen.getByText(/CONNECT APPLE HEALTHKIT/));
    expect(onInitialize).toHaveBeenCalled();
  });
});
