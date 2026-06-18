/**
 * Tests for the SyncScreen. useHealth, StorageService, BackgroundSyncTask, the
 * API client, status cards, navigation focus + safe-area hooks and haptics are
 * mocked. The HealthStatusCard / SyncStatusCard mocks capture their props so we
 * can drive the screen's handlers.
 */

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  // Invoke the focus callback once on mount so its body is exercised.
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));
const mockImpactAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockImpactAsync(...a),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
}));

const mockUseHealth = jest.fn();
jest.mock('../../hooks/useHealth', () => ({ useHealth: () => mockUseHealth() }));

jest.mock('../../services/StorageService', () => ({
  __esModule: true,
  getLastSyncDate: jest.fn(),
  isSyncEnabled: jest.fn(),
  setSyncEnabled: jest.fn(),
}));
jest.mock('../../services/BackgroundSyncTask', () => ({
  isBackgroundSyncRegistered: jest.fn(),
  registerBackgroundSync: jest.fn(),
  unregisterBackgroundSync: jest.fn(),
  triggerManualSync: jest.fn(),
}));
jest.mock('../../config/api', () => ({
  get: jest.fn(),
  endpoints: { activities: '/activities' },
}));

const mockHealthCardProps: Record<string, unknown> = {};
jest.mock('../../components/HealthStatusCard', () => ({
  HealthStatusCard: (props: Record<string, unknown>) => {
    Object.assign(mockHealthCardProps, props);
    return null;
  },
}));
const mockSyncCardProps: Record<string, unknown> = {};
jest.mock('../../components/SyncStatusCard', () => ({
  SyncStatusCard: (props: Record<string, unknown>) => {
    Object.assign(mockSyncCardProps, props);
    return null;
  },
}));

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react-native';
import * as StorageService from '../../services/StorageService';
import * as BackgroundSyncTask from '../../services/BackgroundSyncTask';
import { get } from '../../config/api';
import { SyncScreen } from '../SyncScreen';

const mockGetLastSyncDate = StorageService.getLastSyncDate as jest.Mock;
const mockIsSyncEnabled = StorageService.isSyncEnabled as jest.Mock;
const mockSetSyncEnabled = StorageService.setSyncEnabled as jest.Mock;
const mockIsBgRegistered = BackgroundSyncTask.isBackgroundSyncRegistered as jest.Mock;
const mockRegisterBg = BackgroundSyncTask.registerBackgroundSync as jest.Mock;
const mockUnregisterBg = BackgroundSyncTask.unregisterBackgroundSync as jest.Mock;
const mockTriggerManualSync = BackgroundSyncTask.triggerManualSync as jest.Mock;
const mockApiGet = get as jest.Mock;

const HEALTH_UNINIT = {
  isAvailable: true,
  isInitialized: false,
  permissions: { workouts: false, heartRate: false },
  connectionStatus: 'idle',
  error: null,
  initialize: jest.fn(),
  requestPermissions: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockHealthCardProps)) delete mockHealthCardProps[k];
  for (const k of Object.keys(mockSyncCardProps)) delete mockSyncCardProps[k];
  mockUseHealth.mockReturnValue({ ...HEALTH_UNINIT });
  mockGetLastSyncDate.mockResolvedValue(null);
  mockIsSyncEnabled.mockResolvedValue(true);
  mockSetSyncEnabled.mockResolvedValue(undefined);
  mockIsBgRegistered.mockResolvedValue(false);
  mockRegisterBg.mockResolvedValue(true);
  mockUnregisterBg.mockResolvedValue(true);
  mockTriggerManualSync.mockResolvedValue({ success: true, processedCount: 2 });
  mockApiGet.mockResolvedValue({ data: { activities: [] } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function renderScreen() {
  const utils = render(<SyncScreen onNavigate={jest.fn()} />);
  await waitFor(() => expect(mockGetLastSyncDate).toHaveBeenCalled());
  return utils;
}

describe('SyncScreen', () => {
  it('renders the header and health card, hiding the sync card until initialised', async () => {
    await renderScreen();
    expect(screen.getByText('HEALTH SYNC')).toBeTruthy();
    expect(mockHealthCardProps.isInitialized).toBe(false);
    expect(mockSyncCardProps.onSyncNow).toBeUndefined(); // SyncStatusCard not rendered
  });

  it('shows the sync card when health is initialised', async () => {
    mockUseHealth.mockReturnValue({ ...HEALTH_UNINIT, isInitialized: true });
    await renderScreen();
    expect(mockSyncCardProps.onSyncNow).toBeDefined();
  });

  it('loads recent activities and renders them', async () => {
    mockApiGet.mockResolvedValue({
      data: { activities: [{ id: 'a1', name: 'Morning Run', type: 'Running', startedAt: '2026-01-02T08:00:00Z', durationSeconds: 1800 }] },
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Morning Run')).toBeTruthy());
  });

  it('initialises health and requests permissions via the card callback', async () => {
    const initialize = jest.fn().mockResolvedValue(true);
    const requestPermissions = jest.fn().mockResolvedValue({});
    mockUseHealth.mockReturnValue({ ...HEALTH_UNINIT, initialize, requestPermissions });
    await renderScreen();

    await act(async () => {
      await (mockHealthCardProps.onInitialize as () => Promise<void>)();
    });

    expect(initialize).toHaveBeenCalled();
    expect(requestPermissions).toHaveBeenCalled();
    expect(mockImpactAsync).toHaveBeenCalled();
  });

  it('runs a manual sync and reflects the success result', async () => {
    mockUseHealth.mockReturnValue({ ...HEALTH_UNINIT, isInitialized: true });
    await renderScreen();

    await act(async () => {
      await (mockSyncCardProps.onSyncNow as () => Promise<void>)();
    });

    expect(mockTriggerManualSync).toHaveBeenCalled();
    await waitFor(() => expect(mockSyncCardProps.syncStatus).toBe('success'));
  });

  it('registers background sync when auto-sync is toggled on', async () => {
    mockIsSyncEnabled.mockResolvedValue(false);
    await renderScreen();

    const toggle = screen.getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(mockSetSyncEnabled).toHaveBeenCalledWith(true);
    expect(mockRegisterBg).toHaveBeenCalled();
  });

  it('unregisters background sync when auto-sync is toggled off', async () => {
    await renderScreen();

    const toggle = screen.getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    expect(mockSetSyncEnabled).toHaveBeenCalledWith(false);
    expect(mockUnregisterBg).toHaveBeenCalled();
  });
});
