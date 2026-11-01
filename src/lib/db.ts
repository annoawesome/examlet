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

export function openDatabase(name: string = DEFAULT_DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database upgrade blocked by another open tab.'));
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
