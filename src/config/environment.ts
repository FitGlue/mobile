/**
 * FitGlue Mobile Environment Configuration
 *
 * Provides environment-aware configuration for the mobile app.
 * Uses Expo's Constants to access app.json extra fields.
 */

import Constants from 'expo-constants';

// Environment type
export type Environment = 'development' | 'test' | 'production';

// Get the current environment from Expo Constants
function getEnvironment(): Environment {
  const env = Constants.expoConfig?.extra?.environment ??
    process.env.EXPO_PUBLIC_ENVIRONMENT ??
    'development';

  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'test' || env === 'staging') return 'test';
  return 'development';
}

// Firebase configuration per environment
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// API configuration per environment
interface ApiConfig {
  baseUrl: string;
}

// Full environment configuration
export interface EnvironmentConfig {
  environment: Environment;
  firebase: FirebaseConfig;
  api: ApiConfig;
  debug: boolean;
}

// Development configuration (fitglue-dev)
const developmentConfig: EnvironmentConfig = {
  environment: 'development',
  firebase: {
    apiKey: "AIzaSyD8JUkFQvg6XtU-0b-HJfkETykxYfIh1Ow",
    appId: "1:911679924866:web:33a1ae4ab3c00b2f41229b",
    authDomain: "fitglue-server-dev.firebaseapp.com",
    messagingSenderId: "911679924866",
    projectId: "fitglue-server-dev",
    storageBucket: "fitglue-server-dev.firebasestorage.app"
  },
  api: {
    baseUrl: 'https://dev.fitglue.tech',
  },
  debug: true,
};

// Test/Staging configuration (fitglue-test)
const testConfig: EnvironmentConfig = {
  environment: 'test',
  firebase: {
    apiKey: "AIzaSyD_yxpls_2COX8UH69TJ7YIj0UqT04CEpw",
    appId: "1:797085295878:web:689edb5f7da2c3a4d0ea87",
    authDomain: "fitglue-server-test.firebaseapp.com",
    messagingSenderId: "797085295878",
    projectId: "fitglue-server-test",
    storageBucket: "fitglue-server-test.firebasestorage.app"
  },
  api: {
    baseUrl: 'https://test.fitglue.tech',
  },
  debug: true,
};

// Production configuration (fitglue-prod)
const productionConfig: EnvironmentConfig = {
  environment: 'production',
  firebase: {
    apiKey: "AIzaSyBXg4kJ9vrayJhoQYqDhOvfXZx3t06Sr7c",
    appId: "1:605889586984:web:75e91e2e7d1e085d50521d",
    authDomain: "fitglue-server-prod.firebaseapp.com",
    messagingSenderId: "605889586984",
    projectId: "fitglue-server-prod",
    storageBucket: "fitglue-server-prod.firebasestorage.app"
  },
  api: {
    baseUrl: 'https://fitglue.tech',
  },
  debug: false,
};

// Get configuration based on environment
function getConfig(): EnvironmentConfig {
  const env = getEnvironment();

  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

// Export the current configuration
export const config = getConfig();

// Export individual pieces for convenience
export const environment = config.environment;
export const firebaseConfig = config.firebase;
export const apiConfig = config.api;
export const isDebug = config.debug;

// Log configuration in development
if (config.debug) {
  console.log(`[FitGlue] Environment: ${config.environment}`);
  console.log(`[FitGlue] API Base URL: ${config.api.baseUrl}`);
}
