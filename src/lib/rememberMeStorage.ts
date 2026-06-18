/**
 * "Remember me" preference storage.
 *
 * We store the user's preference in localStorage so it survives browser restarts.
 * The actual session logic is handled in useAuth.tsx on startup.
 */

const REMEMBER_KEY = "chameleon_remember_me";

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
  } catch {
    // Silently fail — storage might be restricted
  }
}

/** Clear the "Remember me" flag (called on explicit logout). */
export function clearRememberMe(): void {
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Silently fail
  }
}
