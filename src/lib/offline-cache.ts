const PREFIX = "cc:";

export function readCachedJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCachedJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* cota cheia ou modo privado: falha silenciosa */
  }
}

export function clearCachedJson(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignora */
  }
}
