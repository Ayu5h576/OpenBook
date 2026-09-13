/**
 * A pdf.js document handle for the attached file.
 *
 * Three things here are deliberate and easy to get wrong.
 *
 * **pdf.js is imported dynamically.** It is by far the largest thing the reader
 * could pull in, and most books never attach a PDF — a static import would put
 * the parser and a worker in the bundle of every page in the app.
 *
 * **The bytes are re-read from the blob on every load.** `getDocument` transfers
 * the buffer it is handed to the worker, which detaches it; caching that
 * `ArrayBuffer` and passing it twice fails the second time. A `Blob` can be read
 * as many times as you like, which is why this takes one.
 *
 * **A load that finishes after the effect re-ran is thrown away.** Attaching a
 * second file while the first is still parsing is an ordinary thing to do, and
 * without the `cancelled` guard the slower parse would win the race and show the
 * wrong document.
 */
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { describePdfError } from '../utils/pdfReading';

/** Resolved and handed to the worker by Vite at build time. */
const WORKER_SRC = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

type PdfjsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/** Load pdf.js once per session and point it at its worker. */
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        return pdfjs;
      })
      .catch((error) => {
        // Let a later attempt retry rather than caching the failure forever.
        pdfjsPromise = null;
        throw error;
      });
  }
  return pdfjsPromise;
}

export interface PdfDocumentHandle {
  doc: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  /** A sentence to show the reader, or null while things are fine. */
  error: string | null;
}

export function usePdfDocument(source: Blob | null): PdfDocumentHandle {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;

    if (!source) {
      setDoc(null);
      setNumPages(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const data = new Uint8Array(await source.arrayBuffer());
        if (cancelled) return;

        opened = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          // The effect moved on while we were parsing; drop this document
          // rather than leaving its worker running.
          opened.destroy().catch(() => {});
          return;
        }

        docRef.current = opened;
        setDoc(opened);
        setNumPages(opened.numPages);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setDoc(null);
        setNumPages(0);
        setError(describePdfError(err));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
      // Releases the worker and the parsed page tree; a reader who opens twenty
      // PDFs must not leave twenty workers behind.
      opened?.destroy().catch(() => {});
    };
  }, [source]);

  return { doc, numPages, isLoading, error };
}
