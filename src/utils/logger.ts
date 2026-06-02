import * as Sentry from '@sentry/react-native';

/**
 * Unified logger. Use this instead of console.error + Sentry.captureException separately.
 * logger.error() logs to the console and forwards the exception to Sentry in one call.
 */
export const logger = {
  error: (message: string, error?: unknown): void => {
    Sentry.captureException(error ?? new Error(message));
    console.error(message, error);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(message, ...args);
  },
};
