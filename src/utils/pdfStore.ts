/**
 * Where an attached PDF lives between visits.
 *
 * Deliberately the browser, not the server: the file never leaves the device, so
 * there is no upload endpoint, no storage bucket and no authorization rule to get
 * wrong. The cost is real and is stated in the UI — the PDF is available on the
 * device it was attached from.
 *
 * Reading *progress* is a different matter and does sync: the page number is
 * written to the reader's `LibraryEntry.currentPage` like any other book, so the
 * shelf and the author page stay correct no matter where the file is.
 *
 * Every function here degrades to "no stored file" rather than throwing.
 * IndexedDB is missing in private windows, can be evicted under storage
 * pressure, and can be blocked outright by browser settings — none of which is a
 * reason the reader should fail to open a book.
 */

const DB_NAME = 'openbook-reader';
const DB_VERSION = 1;
const STORE = 'pdfs';

export interface StoredPdf {
  bookId: string;
  blob: Blob;
  name: string;
  size: number;
  savedAt: string;
}

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!hasIndexedDb()) return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'bookId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      // A blocked or failed open is a missing file, not an error the reader sees.
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Run one request in its own transaction, resolving null on any failure. */
function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        let settled = false;
        const settle = (value: T | null) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        try {
          const tx = db.transaction(STORE, mode);
          const request = run(tx.objectStore(STORE));
          request.onsuccess = () => settle(request.result as T);
          request.onerror = () => settle(null);
          tx.oncomplete = () => {
            db.close();
          };
          tx.onabort = () => {
            db.close();
            settle(null);
          };
        } catch {
          db.close();
          settle(null);
        }
      })
  );
}

/** Keep the file for this book. Returns false when it could not be stored. */
export async function savePdf(bookId: string, file: File): Promise<boolean> {
  if (!bookId) return false;
  const record: StoredPdf = {
    bookId,
    blob: file,
    name: file.name,
    size: file.size,
    savedAt: new Date().toISOString(),
  };
  const result = await withStore<IDBValidKey>('readwrite', (store) => store.put(record));
  return result !== null;
}

/** The file kept for this book, or null when there is none to reopen. */
export async function loadPdf(bookId: string): Promise<StoredPdf | null> {
  if (!bookId) return null;
  const record = await withStore<StoredPdf | undefined>('readonly', (store) => store.get(bookId));
  // A record without its blob is corrupt storage; treat it as absent.
  return record && record.blob ? record : null;
}

/** Forget the file for this book. */
export async function deletePdf(bookId: string): Promise<void> {
  if (!bookId) return;
  await withStore('readwrite', (store) => store.delete(bookId));
}
