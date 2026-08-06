const DB_NAME = "chameleoncoach";
const DB_VERSION = 1;
const STORE = "keyval";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db => new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }),
  );
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await withStore<T | undefined>("readonly", s => s.get(key));
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await withStore("readwrite", s => s.put(value, key));
  } catch {
    /* falha silenciosa: offline não é crítico */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await withStore("readwrite", s => s.delete(key));
  } catch {
    /* ignora */
  }
}

export async function idbKeys(): Promise<string[]> {
  try {
    return await withStore<string[]>("readonly", s => s.getAllKeys() as IDBRequest<string[]>);
  } catch {
    return [];
  }
}
