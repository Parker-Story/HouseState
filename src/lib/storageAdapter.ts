import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore: Record<string, string | null> = {};

const isWeb = Platform.OS === 'web';

export const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // no-op
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch {
        // no-op
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      delete memoryStore[key];
    }
  },
};
