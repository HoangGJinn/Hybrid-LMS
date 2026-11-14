import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

interface DocxViewerProps {
  url: string;
  title: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const DocxViewer = ({ url, title }: DocxViewerProps) => (
  <DocxViewerInner key={url} url={url} title={title} />
);

const DocxViewerInner = ({ url, title }: DocxViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadDocx = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        if (!isActive || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'docx-viewer-content',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
      } catch (err) {
        if (!isActive || controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Unable to preview DOCX file.';
        setError(message);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadDocx();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [url]);

  if (error) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="m-0 text-sm text-destructive">
          Could not render this Word document ({error}). Please download the
          original file to view it.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={url} download={title} target="_blank" rel="noreferrer">
            <Download className="mr-1.5 h-4 w-4" />
            Download {title}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden">
      <div
        role="toolbar"
        aria-label={`Word controls for ${title}`}
        className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Word Document (.docx)
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
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
            aria-label="Reset zoom"
            className="min-w-14 rounded-md border-0 bg-transparent px-2 py-1 text-sm text-foreground hover:bg-accent"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            type="button"
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
          {zoom !== 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reset zoom"
              onClick={() => setZoom(1)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-auto bg-muted p-4">
        {loading && <Skeleton className="h-[60vh] w-full" />}
        <div
          style={{
            transform: zoom === 1 ? undefined : `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
};

export default DocxViewer;

