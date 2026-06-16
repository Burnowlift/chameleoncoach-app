/**
 * "Remember me" support for Supabase Auth — Safari-safe implementation.
 *
 * Strategy: always store auth tokens in localStorage (maximum compatibility).
 * We use a sessionStorage "canary" flag to detect new browser sessions.
 *
 * To avoid race conditions where Supabase loads the token before we can clear it,
 * we provide a custom Storage object `safeStorage` to the Supabase client.
 * This object intercepts `getItem` calls: if it detects a new browser session
 * and "Remember me" was NOT checked, it clears the token and returns null,
 * forcing Supabase to consider the user logged out.
 */

const REMEMBER_KEY = "chameleon_remember_me";
const SESSION_CANARY = "chameleon_session_active";
const SUPABASE_AUTH_PREFIX = "sb-";

/** Whether the user opted into "Remember me" on last login. */
export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the "Remember me" preference (always in localStorage). */
export function setRememberMe(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(REMEMBER_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    // Mark this browser tab/session as active
    sessionStorage.setItem(SESSION_CANARY, "1");
  } catch {
    // Silently fail — storage might be restricted
  }
}

/** Clear the "Remember me" flag (called on explicit logout). */
export function clearRememberMe(): void {
  try {
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(SESSION_CANARY);
  } catch {
    // Silently fail
  }
}

/**
 * A Storage wrapper that intercepts Supabase auth token reads to enforce the
 * "Remember me" behavior securely and synchronously on client startup.
 */
export const safeStorage: Storage = {
  getItem(key: string): string | null {
    try {
      // Intercept only Supabase auth keys
      if (key.startsWith(SUPABASE_AUTH_PREFIX)) {
        const remembered = getRememberMe();
        const sessionActive = sessionStorage.getItem(SESSION_CANARY) === "1";

        if (!remembered && !sessionActive) {
          // New browser session + user didn't want to be remembered → clear auth tokens
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(SUPABASE_AUTH_PREFIX)) {
              keysToRemove.push(k);
            }
          }
          for (const k of keysToRemove) {
            localStorage.removeItem(k);
          }
          
          // Mark this session as active so we don't clear repeatedly
          sessionStorage.setItem(SESSION_CANARY, "1");
          return null; // Force Supabase to see no session
        }
        
        // Ensure session is marked as active
        sessionStorage.setItem(SESSION_CANARY, "1");
      }
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  },

  get length(): number {
    return localStorage.length;
  },

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch {}
  }
};
