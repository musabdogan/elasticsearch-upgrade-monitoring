const isBrowser = typeof window !== 'undefined';

/**
 * Chrome extension storage wrapper.
 * Uses chrome.storage.local for persistence across sessions.
 * Falls back to localStorage for development.
 */

// Check if we're in a Chrome extension context
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

export function getStoredValue<T>(key: string, fallback: T): T {
  if (!isBrowser) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setStoredValue<T>(key: string, value: T) {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Async storage functions for Chrome extension storage API.
 * These provide better persistence and sync capabilities.
 */
export async function getChromeStorageValue<T>(key: string, fallback: T): Promise<T> {
  if (!isChromeExtension) {
    return getStoredValue(key, fallback);
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        resolve(fallback);
        return;
      }
      resolve(result[key] !== undefined ? result[key] : fallback);
    });
  });
}

export async function setChromeStorageValue<T>(key: string, value: T): Promise<void> {
  if (!isChromeExtension) {
    setStoredValue(key, value);
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

