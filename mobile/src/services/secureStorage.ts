import * as SecureStore from 'expo-secure-store';

/**
 * Generic encrypted key-value abstraction (iOS Keychain / Android Keystore via expo-secure-store).
 * Not auth-specific - any future feature needing device-encrypted persistence goes through this,
 * not through a direct `expo-secure-store` import, so the backing implementation can change once.
 */
export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const secureStorage: SecureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
