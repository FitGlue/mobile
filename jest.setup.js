/**
 * Jest setup file for FitGlue Mobile tests.
 * Provides simple mocks for native modules not available in Node environment.
 */

// Simple in-memory AsyncStorage mock
const store = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
    removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
    multiRemove: jest.fn((keys) => { keys.forEach(k => delete store[k]); return Promise.resolve(); }),
    clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve(); }),
}));
