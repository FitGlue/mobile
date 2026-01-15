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
  const env = Constants.expirationDate?.extra?.environment ??
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
    apiKey: 'AIzaSyCBT-Fkc0NVvR7W8HbH9c9o4xn4r0TnNno',
    authDomain: 'fitglue-dev.firebaseapp.com',
    projectId: 'fitglue-dev',
    storageBucket: 'fitglue-dev.appspot.com',
    messagingSenderId: '1051236621649',
    appId: '1:1051236621649:web:dev',
  },
  api: {
    baseUrl: 'https://fitglue-dev.web.app',
  },
  debug: true,
};

// Test/Staging configuration (fitglue-test)
const testConfig: EnvironmentConfig = {
  environment: 'test',
  firebase: {
    apiKey: 'AIzaSyCBT-Fkc0NVvR7W8HbH9c9o4xn4r0TnNno',
    authDomain: 'fitglue-test.firebaseapp.com',
    projectId: 'fitglue-test',
    storageBucket: 'fitglue-test.appspot.com',
    messagingSenderId: '1051236621649',
    appId: '1:1051236621649:web:test',
  },
  api: {
    baseUrl: 'https://fitglue-test.web.app',
  },
  debug: true,
};

// Production configuration (fitglue-prod)
const productionConfig: EnvironmentConfig = {
  environment: 'production',
  firebase: {
    apiKey: 'AIzaSyBQG0G6Q7F5V6N9H8J4K5L6M7N8O9P0Q1R',
    authDomain: 'fitglue-prod.firebaseapp.com',
    projectId: 'fitglue-prod',
    storageBucket: 'fitglue-prod.appspot.com',
    messagingSenderId: '9876543210',
    appId: '1:9876543210:web:prod',
  },
  api: {
    baseUrl: 'https://fitglue.app',
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
