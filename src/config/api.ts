/**
 * FitGlue Mobile API Client
 *
 * Provides authenticated API calls to the FitGlue backend.
 * Automatically handles Firebase Auth token injection.
 */

import { apiConfig } from './environment';
import { auth } from './firebase';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Get the current user's Firebase ID token
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('[API] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${apiConfig.baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: T | undefined;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      status: response.status,
      error: response.ok ? undefined : (data as { error?: string })?.error || response.statusText,
    };
  } catch (error) {
    console.error('[API] Request failed:', error);
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * GET request
 */
export function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export function patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// API endpoints
export const endpoints = {
  // User
  me: '/api/users/me',
  integrations: '/api/users/me/integrations',
  pipelines: '/api/users/me/pipelines',

  // Activities
  activities: '/api/activities',
  activityStats: '/api/activities/stats',
  unsynchronized: '/api/activities/unsynchronized',

  // Inputs
  inputs: '/api/inputs',
  fcmToken: '/api/inputs/fcm-token',

  // Mobile-specific
  mobileSync: '/api/mobile/sync',
};
