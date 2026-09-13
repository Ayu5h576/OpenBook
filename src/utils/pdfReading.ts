/**
 * Pure logic for the PDF reader.
 *
 * Deliberately free of any pdf.js import: the rules that decide which page the
 * reader lands on, and which highlights belong on it, are the parts worth
 * testing, and none of them need a canvas or a worker to be exercised.
 *
 * Pages are **1-based** everywhere in this module, matching pdf.js and the
 * `chapter` numbers the annotation tables already store.
 */

/** Zoom bounds. Below 0.5 the text layer stops lining up with the canvas. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.25;

/**
 * Force a page into range.
 *
 * `numPages` comes from the document itself, so a page number can be stale —
 * a reader who was on page 400 of a 900-page file and then attaches a different
 * edition must not be sent past the end.
 */
export function clampPage(page: number, numPages: number): number {
  if (!Number.isFinite(page) || !Number.isFinite(numPages) || numPages < 1) return 1;
  return Math.min(Math.max(Math.round(page), 1), numPages);
}

export function nextPage(page: number, numPages: number): number {
  return clampPage(clampPage(page, numPages) + 1, numPages);
}

export function previousPage(page: number, numPages: number): number {
  return clampPage(clampPage(page, numPages) - 1, numPages);
}

/** 0–100, rounded. A PDF knows its own page count, so this is exact. */
export function pageProgressPercent(page: number, numPages: number): number {
  if (!Number.isFinite(numPages) || numPages < 1) return 0;
  return Math.min(100, Math.round((clampPage(page, numPages) / numPages) * 100));
}

/**
 * The page to open a document on.
 *
 * `LibraryEntry.currentPage` is **0** for a book that was never opened, but PDF
 * pages are 1-based — passing that 0 straight to pdf.js asks for a page that
 * does not exist and throws. Anything below 1, or past the end of this
 * particular file, opens at page 1.
 */
export function resumePage(storedPage: number | null | undefined, numPages: number): number {
  if (typeof storedPage !== 'number' || !Number.isFinite(storedPage) || storedPage < 1) return 1;
  return clampPage(storedPage, numPages);
}

/** Zoom in fixed steps, clamped at both ends. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  // Rounded to hundredths so repeated stepping cannot accumulate float drift
  // (0.5 + 0.25 + 0.25 …) into something like 1.4999999999999998.
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));
}

export function zoomIn(zoom: number): number {
  return clampZoom(clampZoom(zoom) + ZOOM_STEP);
}

export function zoomOut(zoom: number): number {
  return clampZoom(clampZoom(zoom) - ZOOM_STEP);
}

/** "12 / 340" — the label the toolbar shows. */
export function pageLabel(page: number, numPages: number): string {
  const total = Number.isFinite(numPages) && numPages > 0 ? Math.round(numPages) : 0;
  return `${clampPage(page, total)} / ${total}`;
}

/**
 * The `chapter` number a PDF page is stored under.
 *
 * A PDF has no chapters, so a page *is* its chapter — which is what lets the
 * existing highlight and note tables work on a PDF without a migration.
 */
export function pageChapter(page: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.round(page));
}

/**
 * The highlights saved against the page on screen.
 *
 * A highlight with no chapter belongs to page 1, matching the default the text
 * reader already applies when a book has no chapters.
 */
export function highlightsForPage<T extends { chapter?: number | null }>(
  highlights: T[],
  page: number
): T[] {
  const chapter = pageChapter(page);
  return highlights.filter((h) => (h.chapter ?? 1) === chapter);
}

/** Largest file we will hand to pdf.js. Past this the tab runs out of memory. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

/** Mime type is often blank for a file dragged off the desktop, so the name counts too. */
export function isProbablyPdf(file: { name: string; type?: string }): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Why this file cannot be opened, or null when it looks fine.
 *
 * Run before the file reaches pdf.js so the reader gets a sentence instead of a
 * worker stack trace.
 */
export function pdfFileProblem(file: { name: string; type?: string; size: number }): string | null {
  if (!isProbablyPdf(file)) return 'That file is not a PDF.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_PDF_BYTES) return 'That PDF is too large to open (over 100 MB).';
  return null;
}

/**
 * A sentence for a pdf.js failure.
 *
 * Matched on the error's `name` rather than its class so this module stays free
 * of a pdf.js import — the classes pdf.js throws (`InvalidPDFException`,
 * `PasswordException`, `MissingPDFException`) all set `name` to their own.
 *
 * A password-protected file is worth naming precisely: it is the one failure
 * here the reader can actually do something about, and "could not be opened"
 * would send them looking for a corrupt download instead.
 */
export function describePdfError(error: unknown): string {
  const name =
    typeof error === 'object' && error !== null ? String((error as { name?: unknown }).name ?? '') : '';
  switch (name) {
    case 'PasswordException':
      return 'That PDF is password-protected, so it cannot be opened here.';
    case 'InvalidPDFException':
      return 'That file could not be read as a PDF — it may be damaged or misnamed.';
    case 'MissingPDFException':
      return 'That PDF could not be found. Try attaching it again.';
    default:
      return 'That PDF could not be opened.';
  }
}
