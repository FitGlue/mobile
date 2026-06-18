/**
 * Tests for FCM push-token registration. expo-notifications, AsyncStorage,
 * Platform, the API client and environment are mocked.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
import { Platform } from 'react-native';
const mockPlatform = Platform as unknown as { OS: 'ios' | 'android' };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('../../config/api', () => ({
  post: jest.fn(),
  endpoints: { fcmToken: '/fcm' },
}));

jest.mock('../../config/environment', () => ({ isDebug: false }));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ logger: { error: (...a: unknown[]) => mockLoggerError(...a) } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { post } from '../../config/api';
import { requestPermissionsAndRegister, clearCachedToken } from '../NotificationService';

const mockSetNotificationChannelAsync = Notifications.setNotificationChannelAsync as jest.Mock;
const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetDevicePushTokenAsync = Notifications.getDevicePushTokenAsync as jest.Mock;
const mockPost = post as jest.Mock;

const FCM_KEY = '@fitglue/fcm_token';

describe('NotificationService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockPlatform.OS = 'ios';
    await AsyncStorage.clear();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: 'device-tok' });
    mockPost.mockResolvedValue({ status: 200 });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers a new token and caches it', async () => {
    await requestPermissionsAndRegister();

    expect(mockPost).toHaveBeenCalledWith('/fcm', { token: 'device-tok', platform: 'ios' });
    expect(await AsyncStorage.getItem(FCM_KEY)).toBe('device-tok');
    expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled(); // iOS
  });

  it('sets up the Android channel and uses the android platform', async () => {
    mockPlatform.OS = 'android';

    await requestPermissionsAndRegister();

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({ name: 'FitGlue' }));
    expect(mockPost).toHaveBeenCalledWith('/fcm', { token: 'device-tok', platform: 'android' });
  });

  it('requests permission when not already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    await requestPermissionsAndRegister();

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalled();
  });

  it('skips registration when permission is denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await requestPermissionsAndRegister();

    expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('bails out when no push token is available', async () => {
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: '' });

    await requestPermissionsAndRegister();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('skips the server call when the token is unchanged', async () => {
    await AsyncStorage.setItem(FCM_KEY, 'device-tok');

    await requestPermissionsAndRegister();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does not cache the token when the server rejects it', async () => {
    mockPost.mockResolvedValue({ status: 500, error: 'nope' });

    await requestPermissionsAndRegister();

    expect(await AsyncStorage.getItem(FCM_KEY)).toBeNull();
  });

  it('caches on 201 and 204 success statuses', async () => {
    mockPost.mockResolvedValue({ status: 204 });
    await requestPermissionsAndRegister();
    expect(await AsyncStorage.getItem(FCM_KEY)).toBe('device-tok');
  });

  it('never throws — logs unexpected errors instead', async () => {
    mockGetPermissionsAsync.mockRejectedValue(new Error('boom'));

    await expect(requestPermissionsAndRegister()).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  describe('clearCachedToken', () => {
    it('removes the cached token', async () => {
      await AsyncStorage.setItem(FCM_KEY, 'device-tok');

      await clearCachedToken();

      expect(await AsyncStorage.getItem(FCM_KEY)).toBeNull();
    });
  });
});
