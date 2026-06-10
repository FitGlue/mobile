/**
 * FitGlue Mobile Notification Service
 *
 * Handles FCM push notification token registration with the FitGlue backend.
 * Uses expo-notifications (Expo managed workflow idiomatic).
 *
 * Flow:
 *  1. Request notification permission from the OS
 *  2. Get the raw device push token (FCM on Android, APNs on iOS)
 *  3. Compare against the cached token in AsyncStorage — skip POST if unchanged
 *  4. POST the token to the server's FCM token endpoint
 *  5. Set up the Android default notification channel
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { post, endpoints } from '../config/api';
import { isDebug } from '../config/environment';
import { logger } from '../utils/logger';

const FCM_TOKEN_CACHE_KEY = '@fitglue/fcm_token';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Set up the Android notification channel.
 * This is a no-op on iOS. Must be called before any notifications can be
 * displayed on Android 8+ (API 26+).
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'FitGlue',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF006E',
  });
}

/**
 * Get the cached FCM token from AsyncStorage
 */
async function getCachedToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_CACHE_KEY);
  } catch {
    return null;
  }
}

/**
 * Cache the FCM token in AsyncStorage
 */
async function cacheToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FCM_TOKEN_CACHE_KEY, token);
  } catch (e) {
    console.warn('[NotificationService] Failed to cache FCM token:', e);
  }
}

/**
 * Clear the cached FCM token (call on logout so the next sign-in re-registers)
 */
export async function clearCachedToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_CACHE_KEY);
  } catch (e) {
    console.warn('[NotificationService] Failed to clear cached FCM token:', e);
  }
}

/**
 * Register the device's push token with the FitGlue backend.
 *
 * - Requests notification permission; silently skips if denied.
 * - Avoids redundant server calls by comparing against the cached token.
 * - Safe to call on every app launch — it is idempotent when the token is unchanged.
 */
export async function requestPermissionsAndRegister(): Promise<void> {
  try {
    await setupAndroidChannel();

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (isDebug) {
        console.log('[NotificationService] Permission not granted — skipping token registration');
      }
      return;
    }

    // Retrieve the raw device push token (FCM on Android, APNs on iOS).
    // getExpoPushTokenAsync() returns an Expo relay token (ExponentPushToken[...])
    // which is not accepted by Firebase Admin SDK — we need the underlying device token.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data as string;

    if (!token) {
      console.warn('[NotificationService] No push token available');
      return;
    }

    // Skip the server call if the token hasn't changed
    const cached = await getCachedToken();
    if (cached === token) {
      if (isDebug) {
        console.log('[NotificationService] Token unchanged — skipping registration');
      }
      return;
    }

    // POST token to the FitGlue backend
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const response = await post(endpoints.fcmToken, { token, platform });

    if (response.status === 200 || response.status === 201 || response.status === 204) {
      await cacheToken(token);
      if (isDebug) {
        console.log('[NotificationService] FCM token registered successfully');
      }
    } else {
      console.warn('[NotificationService] FCM token registration failed:', response.status, response.error);
    }
  } catch (e) {
    // Never throw — notification registration must never crash the app
    logger.error('[NotificationService] Unexpected error during token registration:', e);
  }
}
