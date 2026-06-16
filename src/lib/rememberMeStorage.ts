/**
 * Custom storage adapter for Supabase Auth that supports "Remember me" functionality.
 *
 * - When "Remember me" is checked: session tokens are stored in localStorage
 *   (persists across browser sessions).
 * - When "Remember me" is NOT checked: session tokens are stored in sessionStorage
 *   (cleared when the browser/tab is closed).
 *
 * The preference flag itself is always stored in localStorage so that,
 * on the next visit, the client knows where to look for existing tokens.
 */

const REMEMBER_KEY = "chameleon_remember_me";

/** Whether the user opted into "Remember me" on last login. */
export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

/** Persist the "Remember me" preference (always in localStorage). */
export function setRememberMe(value: boolean): void {
  if (value) {
    localStorage.setItem(REMEMBER_KEY, "true");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

/** Clear the "Remember me" flag and remove session data from both storages. */
export function clearRememberMe(): void {
  localStorage.removeItem(REMEMBER_KEY);
}

/**
 * A storage object that implements the Web Storage API interface
 * and delegates to localStorage or sessionStorage based on the
 * "Remember me" preference.
 */
export const rememberMeStorage: Storage = {
  get length(): number {
    return getActiveStorage().length;
  },

  clear(): void {
    // Clear auth data from both storages to avoid stale tokens
    localStorage.clear();
    sessionStorage.clear();
  },

  getItem(key: string): string | null {
    // First try the active storage based on current preference
    const active = getActiveStorage();
    const value = active.getItem(key);
    if (value !== null) return value;

    // Fallback: check the other storage (handles edge case where
    // user had a session in one storage and the flag changed)
    const fallback = active === localStorage ? sessionStorage : localStorage;
    const fallbackValue = fallback.getItem(key);
    if (fallbackValue !== null) {
      // Migrate to the active storage
      active.setItem(key, fallbackValue);
      fallback.removeItem(key);
      return fallbackValue;
    }

    return null;
  },

  setItem(key: string, value: string): void {
    const active = getActiveStorage();
    active.setItem(key, value);

    // Ensure the value is NOT in the other storage
    const other = active === localStorage ? sessionStorage : localStorage;
    other.removeItem(key);
  },

  removeItem(key: string): void {
    // Remove from both storages to be safe
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },

  key(index: number): string | null {
    return getActiveStorage().key(index);
  },
};

function getActiveStorage(): Storage {
  return getRememberMe() ? localStorage : sessionStorage;
}
