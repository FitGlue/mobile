import type { Persistence } from 'firebase/auth';

// firebase's ./auth export has no react-native condition, so getReactNativePersistence
// isn't in its types. Augment the module to expose it.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
