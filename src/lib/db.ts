/**
 * Thin promise wrapper around IndexedDB. This is the only module that
 * touches the IndexedDB API directly; everything else goes through
 * `StudysheetRepository` (see repository.ts).
 */

export const DEFAULT_DB_NAME = 'examlet';
export const DB_VERSION = 1;

export const SHEETS_STORE = 'studysheets';
export const CARDS_STORE = 'cards';
export const CARDS_BY_SHEET_INDEX = 'bySheetId';

/**
 * Opens the database. When a newer version of the app (in another tab or
 * window) needs to upgrade the schema, this connection closes so the upgrade
 * can proceed, then `onVersionChange` runs (by default, a reload into the new
 * version).
 */
export function openDatabase(
  name: string = DEFAULT_DB_NAME,
  onVersionChange: () => void = () => window.location.reload(),
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        onVersionChange();
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    // `blocked` is not fatal: the open finishes once older connections close,
    // which they do through `onversionchange` above.
  });
}

/** Schema migrations. Add a new `if (oldVersion < N)` block per version. */
function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(SHEETS_STORE)) {
    db.createObjectStore(SHEETS_STORE, { keyPath: 'id' });
  }

  if (!db.objectStoreNames.contains(CARDS_STORE)) {
    const cards = db.createObjectStore(CARDS_STORE, { keyPath: 'id' });
    cards.createIndex(CARDS_BY_SHEET_INDEX, 'sheetId', { unique: false });
  }
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves once every request in the transaction has committed. */
export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted.'));
  });
}

/**
 * Asks the browser not to evict our data under storage pressure.
 * Best-effort: browsers may ignore or deny it.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
