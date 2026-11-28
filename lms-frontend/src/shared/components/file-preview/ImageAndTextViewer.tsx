import { useEffect, useState } from 'react';
import {
  Download,
  RotateCcw,
  RotateCw,
  WrapText,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/utils/cn';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const ImageViewer = ({ url, title }: { url: string; title: string }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="m-0 text-sm text-destructive">
          Could not load this image.
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
    <div className="flex h-full flex-col">
      <div
        role="toolbar"
        aria-label={`Image controls for ${title}`}
        className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2"
      >
        <span className="text-xs font-medium text-muted-foreground">Image</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rotate counterclockwise"
            onClick={() => setRotation((r) => (r - 90) % 360)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rotate clockwise"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            disabled={zoom <= 0.25}
            onClick={() => setZoom((z) => clamp(z - 0.25, 0.25, 3))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
            className="min-w-14 rounded-md border-0 bg-transparent px-2 py-1 text-sm text-foreground hover:bg-accent"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => clamp(z + 0.25, 0.25, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted p-4">
        <img
          src={url}
          alt={title}
          onError={() => setHasError(true)}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 150ms ease',
          }}
          className="max-h-full max-w-full rounded object-contain shadow-sm"
        />
      </div>
    </div>
  );
};

export const TextViewer = ({ url, title }: { url: string; title: string }) => (
  <TextViewerInner key={url} url={url} title={title} />
);

const TextViewerInner = ({ url, title }: { url: string; title: string }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wrapLines, setWrapLines] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadText = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (isActive) setContent(text);
      } catch (err) {
        if (!isActive || controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : 'Could not load text file.',
        );
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadText();
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
          Could not read text file ({error}).
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

  const lines = content.split('\n');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">
          {lines.length} lines
        </span>
        <Button
          type="button"
          variant={wrapLines ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setWrapLines((w) => !w)}
          className="h-7 px-2 text-xs"
        >
          <WrapText className="mr-1 h-3.5 w-3.5" />
          Wrap lines
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-background p-3 font-mono text-xs">
        {loading ? (
          <Skeleton className="h-[55vh] w-full" />
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="hover:bg-muted/40">
                  <td className="w-10 select-none pr-3 text-right align-top text-muted-foreground/70">
                    {index + 1}
                  </td>
                  <td
                    className={cn(
                      'align-top text-foreground',
                      wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
                    )}
                  >
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

