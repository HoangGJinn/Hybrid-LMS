import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/utils/cn';

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface PdfViewerProps {
  url: string;
  title: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isCancelled = (error: unknown): boolean =>
  error instanceof Error && error.name === 'RenderingCancelledException';

/** Single-page PDF viewer: page navigation, zoom relative to the fit-to-width size, keyboard support. */
const PdfViewer = ({ url, title }: PdfViewerProps) => (
  <PdfViewerInner key={url} url={url} title={title} />
);

const PdfViewerInner = ({ url, title }: PdfViewerProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [hasError, setHasError] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(1);
  const [frameWidth, setFrameWidth] = useState(0);
  const pageCount = pdf?.numPages ?? 0;

  // Load the document; destroy it when the url changes or the viewer unmounts.
  useEffect(() => {
    let isActive = true;
    const task = getDocument({ url });
    task.promise
      .then((doc) => {
        if (isActive) setPdf(doc);
      })
      .catch(() => {
        if (isActive) setHasError(true);
      });
    return () => {
      isActive = false;
      task.destroy().catch(() => undefined);
    };
  }, [url]);

  // Track the container width so "100%" always means fit-to-width.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) =>
      setFrameWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Render the current page. A previous render on the same canvas must finish cancelling first.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !canvas || frameWidth === 0) return;
    let isActive = true;
    const render = async () => {
      try {
        const previous = renderTaskRef.current;
        if (previous) {
          previous.cancel();
          await previous.promise.catch(() => undefined);
        }
        const page = await pdf.getPage(pageNumber);
        if (!isActive) return;
        const baseWidth = page.getViewport({ scale: 1 }).width;
        const outputScale = window.devicePixelRatio || 1;
        const cssScale = (frameWidth / baseWidth) * zoom;
        const viewport = page.getViewport({ scale: cssScale * outputScale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
        canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
        const task = page.render({ canvas, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (error) {
        if (isActive && !isCancelled(error)) setHasError(true);
      }
    };
    void render();
    return () => {
      isActive = false;
      renderTaskRef.current?.cancel();
    };
  }, [pdf, pageNumber, zoom, frameWidth]);

  const goToPage = (next: number) => {
    const target = clamp(next, 1, Math.max(pageCount, 1));
    setPageNumber(target);
    setPageInput(String(target));
  };

  const handlePageInputCommit = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) setPageInput(String(pageNumber));
    else goToPage(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      goToPage(pageNumber + 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      goToPage(pageNumber - 1);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      goToPage(1);
    }
    if (event.key === 'End') {
      event.preventDefault();
      goToPage(pageCount);
    }
    if (event.key === '+' || event.key === '=')
      setZoom((z) => clamp(z + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
    if (event.key === '-')
      setZoom((z) => clamp(z - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  };

  if (hasError) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-48 items-center justify-center p-6 text-center text-sm text-destructive"
      >
        Could not display this PDF. Try downloading it instead.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
      <div
        role="toolbar"
        aria-label={`Controls for ${title}`}
        className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={!pdf || pageNumber <= 1}
            onClick={() => goToPage(pageNumber - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="sr-only">Page number</span>
            <input
              value={pageInput}
              inputMode="numeric"
              disabled={!pdf}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePageInputCommit();
              }}
              className="h-8 w-12 rounded-md border bg-background text-center text-sm text-foreground"
            />
            / {pageCount || '–'}
          </label>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={!pdf || pageNumber >= pageCount}
            onClick={() => goToPage(pageNumber + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() =>
              setZoom((z) => clamp(z - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))
            }
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset zoom to fit width"
            className="min-w-14 rounded-md border-0 bg-transparent px-2 py-1 text-sm text-foreground hover:bg-accent"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() =>
              setZoom((z) => clamp(z + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))
            }
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={frameRef}
        tabIndex={0}
        aria-label={`${title}, page ${pageNumber} of ${pageCount || 'unknown'}`}
        className="relative min-h-0 flex-1 overflow-auto bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {!pdf && <Skeleton className="m-4 h-[60vh] w-[calc(100%-2rem)]" />}
        <canvas
          ref={canvasRef}
          className={cn('mx-auto bg-white shadow-md', pdf ? 'block' : 'hidden')}
        />
      </div>
    </div>
  );
};

export default PdfViewer;
