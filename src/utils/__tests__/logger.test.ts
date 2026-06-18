/**
 * Tests for the unified logger. Sentry is mocked so we can assert the
 * console + Sentry fan-out without a real Sentry transport.
 */
const mockCaptureException = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { logger } from '../logger';

describe('logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCaptureException.mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('error', () => {
    it('forwards the provided error to Sentry and logs it', () => {
      const err = new Error('boom');
      logger.error('something failed', err);

      expect(mockCaptureException).toHaveBeenCalledWith(err);
      expect(consoleErrorSpy).toHaveBeenCalledWith('something failed', err);
    });

    it('synthesises an Error from the message when no error is given', () => {
      logger.error('no error object');

      expect(mockCaptureException).toHaveBeenCalledTimes(1);
      const captured = mockCaptureException.mock.calls[0][0];
      expect(captured).toBeInstanceOf(Error);
      expect((captured as Error).message).toBe('no error object');
    });
  });

  describe('warn', () => {
    it('logs to console.warn with extra args and does not hit Sentry', () => {
      logger.warn('heads up', 1, 'two');

      expect(consoleWarnSpy).toHaveBeenCalledWith('heads up', 1, 'two');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });
});
