class MockStorage {
  constructor() { this.data = new Map(); }
  getItem(k) { return this.data.get(k) || null; }
  setItem(k, v) { this.data.set(k, v); }
  removeItem(k) { this.data.delete(k); }
  get length() { return this.data.size; }
  key(i) { return Array.from(this.data.keys())[i] || null; }
}
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();

const REMEMBER_KEY = "chameleon_remember_me";
const SESSION_CANARY = "chameleon_session_active";
const SUPABASE_AUTH_PREFIX = "sb-";

function getRememberMe() { return localStorage.getItem(REMEMBER_KEY) === "true"; }
function setRememberMe(value) {
  if (value) localStorage.setItem(REMEMBER_KEY, "true");
  else localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.setItem(SESSION_CANARY, "1");
}

const safeStorage = {
  getItem(key) {
    if (key.startsWith(SUPABASE_AUTH_PREFIX)) {
      const remembered = getRememberMe();
      const sessionActive = sessionStorage.getItem(SESSION_CANARY) === "1";
      if (!remembered && !sessionActive) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(SUPABASE_AUTH_PREFIX)) keysToRemove.push(k);
        }
        for (const k of keysToRemove) localStorage.removeItem(k);
        sessionStorage.setItem(SESSION_CANARY, "1");
        return null;
      }
      sessionStorage.setItem(SESSION_CANARY, "1");
    }
    return localStorage.getItem(key);
  },
  setItem(k, v) { localStorage.setItem(k, v); }
};

// Test 1: User logs in with Remember Me
setRememberMe(true);
safeStorage.setItem("sb-token", "VALID_TOKEN");
console.log("Logged in with Remember Me. Token:", safeStorage.getItem("sb-token"));

// Simulate closing browser (sessionStorage cleared)
global.sessionStorage = new MockStorage();
console.log("Browser reopened. Token:", safeStorage.getItem("sb-token"));

// Test 2: User logs in without Remember Me
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
setRememberMe(false);
safeStorage.setItem("sb-token", "VALID_TOKEN");
console.log("Logged in WITHOUT Remember Me. Token:", safeStorage.getItem("sb-token"));

// Simulate closing browser
global.sessionStorage = new MockStorage();
console.log("Browser reopened. Token:", safeStorage.getItem("sb-token"));
