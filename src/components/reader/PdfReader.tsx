/**
 * The pdf.js renderer.
 *
 * A page is drawn twice: once to a canvas, and once as a layer of transparent
 * spans holding the same text. The canvas is the picture; the spans are what
 * makes the picture selectable — and it is the *selection* the reader's existing
 * highlight system consumes, so the two have to line up exactly. The maths that
 * puts each span over its ink lives in `utils/pdfTextLayer.ts`.
 *
 * Saved highlights are drawn as a third layer of boxes *over* the page rather
 * than by wrapping the spans in `<mark>`. Wrapping would rewrite the very text
 * nodes the selection offsets are measured against, so adding a highlight could
 * shift the position of the next one; boxes leave the text layer untouched.
 *
 * The text layer is painted straight to the DOM rather than through React. A
 * dense page is several hundred spans, and they are replaced wholesale on every
 * turn of the page — reconciliation would be pure overhead on a subtree React
 * never needs to diff.
 *
 * This component is rendered *inside* `ReaderView`'s `<article>`, which is what
 * lets the reader's existing `onMouseUp` selection handler work on a PDF
 * unchanged: it already only asks that the selection be inside that element.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Minus, Plus } from 'lucide-react';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { canvasScale, locateHighlight, pageText, textItemPlacement } from '../../utils/pdfTextLayer';
import { clampPage, nextPage, pageLabel, previousPage, zoomIn, zoomOut } from '../../utils/pdfReading';
import { HIGHLIGHT_MARK_BG } from '../../utils/highlightStyles';

/** A highlight as this renderer needs it. */
export interface PdfPageHighlight {
  id: string;
  text: string;
  color: string;
}

interface PdfReaderProps {
  file: Blob;
  page: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onNumPages: (numPages: number) => void;
  /** The page's own text, so the study panel and AI drawer can be grounded on
   *  what is actually on screen rather than on the book's description. */
  onPageText?: (text: string) => void;
  /** Saved highlights for this page, replayed over the canvas. */
  highlights?: PdfPageHighlight[];
  borderColor: string;
}

/** One text item as pdf.js reports it. */
interface PdfTextItem {
  str: string;
  transform: number[];
  hasEOL?: boolean;
}

export function PdfReader({
  file,
  page,
  onPageChange,
  zoom,
  onZoomChange,
  onNumPages,
  onPageText,
  highlights,
  borderColor,
}: PdfReaderProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // What the last paint produced, so highlights can be redrawn without
  // re-rendering the page they sit on.
  const spansRef = useRef<Array<HTMLSpanElement | null>>([]);
  const itemsRef = useRef<PdfTextItem[]>([]);

  // Held in a ref so the parent can pass a fresh closure every render without
  // retriggering the paint effect below — repainting a page on every parent
  // render would make the reader flicker while they typed in the study drawer.
  const onPageTextRef = useRef(onPageText);
  useEffect(() => {
    onPageTextRef.current = onPageText;
  });

  const { doc, numPages, isLoading, error } = usePdfDocument(file);

  const pageIndex = clampPage(page, numPages);

  useEffect(() => {
    if (numPages > 0) onNumPages(numPages);
  }, [numPages, onNumPages]);

  const repaintHighlights = useCallback((forHighlights: PdfPageHighlight[] = []) => {
    const overlay = overlayRef.current;
    const container = pageRef.current;
    if (!overlay || !container) return;
    paintHighlights(overlay, container, spansRef.current, itemsRef.current, forHighlights);
  }, []);

  // Paint one page: canvas, text layer, then the highlights on top of it.
  useEffect(() => {
    if (!doc || numPages < 1) return;

    let cancelled = false;
    let task: RenderTask | null = null;

    (async () => {
      try {
        const pdfPage = await doc.getPage(pageIndex);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const textLayer = textLayerRef.current;
        if (!canvas || !textLayer) return;

        // The canvas is drawn at device resolution so it is crisp on retina
        // screens, then sized back down to CSS pixels by the stylesheet.
        const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
        const pixelViewport = pdfPage.getViewport({ scale: canvasScale(zoom, dpr) });
        const cssViewport = pdfPage.getViewport({ scale: zoom });

        canvas.width = Math.floor(pixelViewport.width);
        canvas.height = Math.floor(pixelViewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;
        textLayer.style.width = `${Math.floor(cssViewport.width)}px`;
        textLayer.style.height = `${Math.floor(cssViewport.height)}px`;

        const context = canvas.getContext('2d');
        if (!context) return;

        task = pdfPage.render({ canvasContext: context, viewport: pixelViewport });
        await task.promise;
        if (cancelled) return;

        const textContent = await pdfPage.getTextContent();
        if (cancelled) return;
        const items = textContent.items as PdfTextItem[];
        spansRef.current = paintTextLayer(textLayer, items, cssViewport.transform);
        itemsRef.current = items;
        onPageTextRef.current?.(pageText(items));

        // The highlight effect below also runs on mount; this call covers the
        // case where it already ran against the previous page.
        repaintHighlights();

        setRenderError(null);
        // Hands back the page's own buffers; a long read would otherwise hold
        // every page it has visited in memory.
        pdfPage.cleanup();
      } catch (err) {
        // A cancelled render rejects by design — that is not a failure to show.
        if (cancelled) return;
        setRenderError(describeRenderError(err));
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageIndex, zoom, numPages, repaintHighlights]);

  // Redraw the highlight boxes when the annotations change, or when the page is
  // resized by a zoom — the boxes are in page pixels, so they must follow it.
  useEffect(() => {
    repaintHighlights(highlights ?? []);
  }, [highlights, zoom, repaintHighlights]);

  const goToPrevious = useCallback(
    () => onPageChange(previousPage(pageIndex, numPages)),
    [onPageChange, pageIndex, numPages]
  );
  const goToNext = useCallback(
    () => onPageChange(nextPage(pageIndex, numPages)),
    [onPageChange, pageIndex, numPages]
  );

  // Arrow keys turn the page, matching the text reader's expectation that the
  // reader is the thing with focus on screen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goToNext();
      else if (event.key === 'ArrowLeft') goToPrevious();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToNext, goToPrevious]);

  if (isLoading) {
    return <PdfNotice title="Opening your PDF…" body="This can take a moment for a large file." />;
  }

  if (error) {
    return <PdfNotice title="That PDF could not be opened" body={error} tone="error" />;
  }

  if (!doc) return null;

  return (
    <div className="space-y-4">
      {/* Page turns live in the reader's sticky footer, not here, so they stay
          reachable on a long page; this strip carries the page count and the
          zoom, which is the part that is specific to a PDF. */}
      <div
        className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2 text-xs"
        style={{ borderColor }}
      >
        <span className="tabular-nums opacity-80">{pageLabel(pageIndex, numPages)}</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(zoomOut(zoom))}
            aria-label="Zoom out"
            className="rounded p-1"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-12 text-center tabular-nums opacity-80">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(zoomIn(zoom))}
            aria-label="Zoom in"
            className="rounded p-1"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {renderError && (
        <PdfNotice title="This page could not be drawn" body={renderError} tone="error" />
      )}

      {/* The page: canvas underneath, selectable text over it, highlight boxes
          over that. All three are the same size, so the boxes line up with the
          ink without any further correction. */}
      <div className="flex justify-center">
        <div ref={pageRef} className="relative shadow-lg" style={{ lineHeight: 1 }}>
          <canvas ref={canvasRef} className="block bg-white" />
          <div
            ref={textLayerRef}
            className="openbook-pdf-text-layer absolute left-0 top-0 overflow-hidden"
          />
          <div ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
        </div>
      </div>

      {/* Selection over a PDF is invisible without this: the spans are
          transparent, so the browser needs telling what to paint behind them. */}
      <style>{`
        .openbook-pdf-text-layer span {
          position: absolute;
          white-space: pre;
          transform-origin: 0 0;
          color: transparent;
          cursor: text;
        }
        .openbook-pdf-text-layer ::selection {
          background: rgba(224, 169, 109, 0.45);
        }
      `}</style>
    </div>
  );
}

/**
 * Cover a page with transparent spans holding its text.
 *
 * `item.str` is the raw run, spaces and all — trimming or joining runs here
 * would change the offsets the browser uses to build a selection range, and the
 * highlighted excerpt is taken from the DOM selection, not from pdf.js.
 *
 * Returns the spans **aligned with `items`**, with null where a run produced no
 * span, so a run index from `locateHighlight` can be used to reach the matching
 * text node without a second lookup table.
 */
function paintTextLayer(
  container: HTMLDivElement,
  items: PdfTextItem[],
  viewportTransform: number[]
): Array<HTMLSpanElement | null> {
  const fragment = document.createDocumentFragment();
  const spans: Array<HTMLSpanElement | null> = [];

  for (const item of items) {
    if (!item || typeof item.str !== 'string' || item.str === '') {
      spans.push(null);
      continue;
    }
    const placement = textItemPlacement(item.transform, viewportTransform);
    if (!placement) {
      spans.push(null);
      continue;
    }

    const span = document.createElement('span');
    span.textContent = item.str;
    span.style.left = `${placement.left}px`;
    span.style.top = `${placement.top}px`;
    span.style.fontSize = `${placement.fontSize}px`;
    if (placement.angle) span.style.transform = `rotate(${placement.angle}deg)`;
    fragment.appendChild(span);
    spans.push(span);
  }

  container.replaceChildren(fragment);
  return spans;
}

/**
 * Draw a box behind every saved highlight on this page.
 *
 * The excerpt is looked up in the spans' *own* text rather than in the pdf.js
 * items, so a run that produced no span cannot shift every offset after it.
 */
function paintHighlights(
  overlay: HTMLDivElement,
  page: HTMLElement,
  spans: Array<HTMLSpanElement | null>,
  items: PdfTextItem[],
  highlights: PdfPageHighlight[]
): void {
  overlay.replaceChildren();
  if (!highlights.length || !spans.length) return;

  const runs = items.map((item, i) => ({
    str: spans[i]?.textContent ?? '',
    hasEOL: item?.hasEOL,
  }));
  const pageRect = page.getBoundingClientRect();

  for (const highlight of highlights) {
    const found = locateHighlight(runs, highlight.text);
    if (!found) continue;

    const startNode = spans[found.startRun]?.firstChild;
    const endNode = spans[found.endRun]?.firstChild;
    if (!startNode || !endNode) continue;

    const range = document.createRange();
    try {
      const startLength = startNode.textContent?.length ?? 0;
      const endLength = endNode.textContent?.length ?? 0;
      range.setStart(startNode, Math.min(found.startOffset, startLength));
      // `endOffset` is the last character itself; a Range's end is exclusive.
      range.setEnd(endNode, Math.min(found.endOffset + 1, endLength));
    } catch {
      // A range that does not satisfy the DOM's own ordering rules — skip this
      // highlight rather than losing the whole page to it.
      continue;
    }

    const color =
      HIGHLIGHT_MARK_BG[highlight.color as keyof typeof HIGHLIGHT_MARK_BG] ??
      HIGHLIGHT_MARK_BG.amber;

    // One box per line the highlight covers: a highlight that wraps across three
    // lines is three rectangles, which is what a highlighter would do anyway.
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width === 0 || rect.height === 0) continue;
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.left = `${rect.left - pageRect.left}px`;
      box.style.top = `${rect.top - pageRect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      box.style.background = color;
      // Lets the printed page show through the marker, as ink would.
      box.style.mixBlendMode = 'multiply';
      overlay.appendChild(box);
    }
  }
}

/** A render failure is a drawing problem, not a document problem. */
function describeRenderError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  return message
    ? `pdf.js reported: ${message}`
    : 'pdf.js could not draw this page. Try moving to another page.';
}

function PdfNotice({
  title,
  body,
  tone = 'plain',
}: {
  title: string;
  body: string;
  tone?: 'plain' | 'error';
}) {
  return (
    <div
      className="rounded-lg border p-6 text-center"
      style={{ borderColor: tone === 'error' ? '#B4553F' : 'var(--line, #E5E0D8)' }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs opacity-70">{body}</p>
    </div>
  );
}
