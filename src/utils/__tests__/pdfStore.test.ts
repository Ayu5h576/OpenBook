/**
 * The attached-PDF store.
 *
 * Two things are under test. The obvious one is the round trip. The important
 * one is that the store never throws: it runs in environments where IndexedDB is
 * missing (private windows), blocked (browser settings), or broken, and in all
 * three cases the reader must simply find no stored file and carry on.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { savePdf, loadPdf, deletePdf } from '../pdfStore';

/** A File stand-in — the store only reads `name` and `size`. */
const pdfFile = (name = 'dune.pdf', size = 2048) => ({ name, size }) as unknown as File;

/** A minimal in-memory IndexedDB: one object store, three methods. */
function installFakeIndexedDb() {
  const rows = new Map<string, any>();

  const settle = (compute: () => any) => {
    const request: any = {};
    queueMicrotask(() => {
      try {
        request.result = compute();
        request.onsuccess?.();
      } catch {
        request.onerror?.();
      }
    });
    return request;
  };

  const store = {
    put: (record: any) => settle(() => rows.set(record.bookId, record)),
    get: (key: string) => settle(() => rows.get(key)),
    delete: (key: string) => settle(() => rows.delete(key)),
  };

  const tx = {
    objectStore: () => store,
    oncomplete: null as null | (() => void),
    onabort: null as null | (() => void),
  };

  const db = {
    transaction: () => {
      queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.()));
      return tx;
    },
    close: () => {},
    objectStoreNames: { contains: () => true },
  };

  vi.stubGlobal('indexedDB', {
    open: () => {
      const request: any = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  });

  return rows;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('with a working IndexedDB', () => {
  it('keeps a PDF and hands it back', async () => {
    installFakeIndexedDb();

    expect(await savePdf('book-1', pdfFile())).toBe(true);

    const stored = await loadPdf('book-1');
    expect(stored?.name).toBe('dune.pdf');
    expect(stored?.size).toBe(2048);
    expect(stored?.savedAt).toBeTruthy();
  });

  it('keeps one file per book, not one per reader', async () => {
    installFakeIndexedDb();
    await savePdf('book-1', pdfFile('dune.pdf'));
    await savePdf('book-2', pdfFile('messiah.pdf'));

    expect((await loadPdf('book-1'))?.name).toBe('dune.pdf');
    expect((await loadPdf('book-2'))?.name).toBe('messiah.pdf');
  });

  it('forgets a file when asked to', async () => {
    installFakeIndexedDb();
    await savePdf('book-1', pdfFile());

    await deletePdf('book-1');

    expect(await loadPdf('book-1')).toBeNull();
  });

  it('treats a stored record with no blob as absent', async () => {
    // Corrupt or half-written storage must not hand a broken blob to pdf.js.
    const rows = installFakeIndexedDb();
    rows.set('book-1', { bookId: 'book-1', name: 'dune.pdf', size: 10, savedAt: 'x' });

    expect(await loadPdf('book-1')).toBeNull();
  });

  it('reads a book that has no stored file as absent', async () => {
    installFakeIndexedDb();
    expect(await loadPdf('never-attached')).toBeNull();
  });
});

describe('without a usable IndexedDB', () => {
  it('finds no file when IndexedDB is missing entirely', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await loadPdf('book-1')).toBeNull();
  });

  it('fails to save, rather than throwing, when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await savePdf('book-1', pdfFile())).toBe(false);
  });

  it('deletes quietly when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(deletePdf('book-1')).resolves.toBeUndefined();
  });

  it('treats a blocked open as a missing file', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => ({ set onblocked(fn: () => void) { queueMicrotask(fn); } }),
    });
    expect(await loadPdf('book-1')).toBeNull();
  });

  it('treats a failed open as a missing file', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => ({ set onerror(fn: () => void) { queueMicrotask(fn); } }),
    });
    expect(await loadPdf('book-1')).toBeNull();
  });

  it('survives an IndexedDB that throws on open', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('storage disabled by browser settings');
      },
    });
    expect(await loadPdf('book-1')).toBeNull();
    expect(await savePdf('book-1', pdfFile())).toBe(false);
  });

  it('refuses to store a file with no book to attach it to', async () => {
    installFakeIndexedDb();
    expect(await savePdf('', pdfFile())).toBe(false);
  });
});
