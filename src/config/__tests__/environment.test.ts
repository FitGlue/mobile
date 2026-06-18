/**
 * Tests for environment resolution. The module computes its config at import
 * time from Expo Constants + EXPO_PUBLIC_ENVIRONMENT, so each case re-imports
 * the module in isolation with a fresh mock / env.
 */

const mockConstants = { expoConfig: { extra: {} as Record<string, unknown> } };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
}));

/** Load the environment module fresh with a given extra.environment + env var. */
function loadWith(extraEnv: string | undefined, publicEnv: string | undefined) {
  mockConstants.expoConfig.extra = extraEnv === undefined ? {} : { environment: extraEnv };
  if (publicEnv === undefined) {
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  } else {
    process.env.EXPO_PUBLIC_ENVIRONMENT = publicEnv;
  }
  let mod!: typeof import('../environment');
  jest.isolateModules(() => {
    mod = require('../environment');
  });
  return mod;
}

describe('environment config', () => {
  const originalPublicEnv = process.env.EXPO_PUBLIC_ENVIRONMENT;

  afterEach(() => {
    if (originalPublicEnv === undefined) {
      delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    } else {
      process.env.EXPO_PUBLIC_ENVIRONMENT = originalPublicEnv;
    }
  });

  it('defaults to development when nothing is set', () => {
    const mod = loadWith(undefined, undefined);
    expect(mod.environment).toBe('development');
    expect(mod.config.firebase.projectId).toBe('fitglue-server-dev');
    expect(mod.apiConfig.baseUrl).toBe('https://dev.fitglue.tech');
    expect(mod.isDebug).toBe(true);
  });

  it('resolves production from "production" and "prod" aliases', () => {
    expect(loadWith('production', undefined).environment).toBe('production');
    const prod = loadWith('prod', undefined);
    expect(prod.environment).toBe('production');
    expect(prod.firebaseConfig.projectId).toBe('fitglue-server-prod');
    expect(prod.apiConfig.baseUrl).toBe('https://fitglue.tech');
    expect(prod.isDebug).toBe(false);
  });

  it('resolves test from "test" and "staging" aliases', () => {
    expect(loadWith('test', undefined).environment).toBe('test');
    const staging = loadWith('staging', undefined);
    expect(staging.environment).toBe('test');
    expect(staging.firebaseConfig.projectId).toBe('fitglue-server-test');
    expect(staging.apiConfig.baseUrl).toBe('https://test.fitglue.tech');
  });

  it('falls back to the EXPO_PUBLIC_ENVIRONMENT var when Constants has none', () => {
    const mod = loadWith(undefined, 'production');
    expect(mod.environment).toBe('production');
  });

  it('prefers the Constants extra value over the env var', () => {
    const mod = loadWith('test', 'production');
    expect(mod.environment).toBe('test');
  });

  it('treats unknown values as development', () => {
    expect(loadWith('banana', undefined).environment).toBe('development');
  });
});
