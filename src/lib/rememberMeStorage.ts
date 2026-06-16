/**
 * "Remember me" support for Supabase Auth — Safari-safe implementation.
 *
 * Strategy: always store auth tokens in localStorage (maximum compatibility).
 * We use a sessionStorage "canary" flag to detect new browser sessions.
 * When the browser is closed and reopened:
 *   - sessionStorage is cleared (by the browser)
 *   - if "Remember me" was NOT checked, we clear the auth tokens from localStorage
 *   - if "Remember me" WAS checked, we leave the tokens intact (auto-login)
 *
 * This avoids the Safari/iOS issues caused by routing auth tokens through
 * sessionStorage directly.
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
 * Call this once on app startup (e.g. in main.tsx or AuthProvider).
 *
 * If the user did NOT check "Remember me" and this is a new browser session
 * (sessionStorage canary is missing), we clear the Supabase auth tokens
 * from localStorage so the user has to log in again.
 */
export function enforceRememberMe(): void {
  try {
    const remembered = getRememberMe();
    const sessionActive = sessionStorage.getItem(SESSION_CANARY) === "1";

    if (!remembered && !sessionActive) {
      // New browser session + user didn't want to be remembered → clear auth tokens
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SUPABASE_AUTH_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }

    // Mark this session as active (survives page reloads within the same session)
    sessionStorage.setItem(SESSION_CANARY, "1");
  } catch {
    // Silently fail — some browsers restrict storage access
  }
}
