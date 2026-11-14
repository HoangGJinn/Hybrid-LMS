import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Download, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/utils/cn';
import { ImageViewer, TextViewer } from './ImageAndTextViewer';
import {
  detectPreviewKind,
  type PdfPageOverlayRenderer,
  type PreviewableFile,
} from './types';
import { useElementFullscreen } from './useElementFullscreen';

const PdfViewer = lazy(() => import('./PdfViewer'));
const DocxViewer = lazy(() => import('./DocxViewer'));
const SpreadsheetViewer = lazy(() => import('./SpreadsheetViewer'));
const PresentationViewer = lazy(() => import('./PresentationViewer'));

export interface FilePreviewPanelProps {
  files: PreviewableFile[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  renderPdfPageOverlay?: PdfPageOverlayRenderer;
  className?: string;
  emptyMessage?: string;
  allowFullScreen?: boolean;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
}

const FORMAT_LABELS: Record<ReturnType<typeof detectPreviewKind>, string> = {
  pdf: 'PDF',
  docx: 'Word',
  spreadsheet: 'Spreadsheet',
  presentation: 'PowerPoint',
  image: 'Image',
  text: 'Text / Code',
  unsupported: 'File',
};

const FullScreenPreviewDialog = ({
  files,
  activeIndex,
  onActiveIndexChange,
  renderPdfPageOverlay,
  onClose,
}: {
  files: PreviewableFile[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderPdfPageOverlay?: PdfPageOverlayRenderer;
  onClose: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }, []);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Full screen file preview"
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none rounded-xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/75"
    >
      <FilePreviewPanel
        files={files}
        activeIndex={activeIndex}
        onActiveIndexChange={onActiveIndexChange}
        renderPdfPageOverlay={renderPdfPageOverlay}
        allowFullScreen={false}
        isFullScreen
        onExitFullScreen={onClose}
        className="h-full rounded-xl border-0"
      />
    </dialog>
  );
};

export const FilePreviewPanel = ({
  files,
  activeIndex,
  onActiveIndexChange,
  renderPdfPageOverlay,
  className,
  emptyMessage = 'No files attached to preview.',
  allowFullScreen = true,
  isFullScreen = false,
  onExitFullScreen,
}: FilePreviewPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(0);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const { isNativeFullscreen, enterFullscreen, exitFullscreen } =
    useElementFullscreen(panelRef);
  const currentIndex = activeIndex ?? internalIndex;
  const safeIndex =
    files.length === 0 ? 0 : Math.min(Math.max(0, currentIndex), files.length - 1);

  const handleSelectIndex = (idx: number) => {
    setInternalIndex(idx);
    onActiveIndexChange?.(idx);
  };

  const handleEnterFullScreen = async () => {
    const enteredNative = await enterFullscreen();
    if (!enteredNative) {
      setFullScreenOpen(true);
    }
  };

  const handleExitFullScreen = () => {
    if (isNativeFullscreen) {
      void exitFullscreen();
    }
    onExitFullScreen?.();
  };

  const showingFullScreen = isFullScreen || isNativeFullscreen;

  if (files.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full min-h-64 w-full min-w-0 max-w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground',
          className,
        )}
      >
        <FileText className="h-10 w-10" />
        <p className="m-0 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const activeFile = files[safeIndex];
  const kind = detectPreviewKind(activeFile.fileName);
  const hasFileUrl = Boolean(activeFile.fileUrl && activeFile.fileUrl !== '#');

  return (
    <>
      <div
        ref={panelRef}
        className={cn(
          'flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border bg-card',
          className,
          isNativeFullscreen && 'h-screen w-screen rounded-none border-0 bg-card',
        )}
      >
        {/* Top File Bar, Full-screen Toggle & Download Fallback */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {files.length > 1 ? (
              files.map((file, idx) => (
                <button
                  key={file.fileId ?? `${file.fileName}-${idx}`}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  className={cn(
                    'inline-flex max-w-[220px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    idx === safeIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                  title={file.fileName}
                >
                  <span className="shrink-0 opacity-75">{idx + 1}.</span>
                  <span className="truncate">{file.fileName}</span>
                </button>
              ))
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand" />
                <span
                  className="truncate text-sm font-medium text-foreground"
                  title={activeFile.fileName}
                >
                  {activeFile.fileName}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {FORMAT_LABELS[kind]}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {showingFullScreen && (isNativeFullscreen || onExitFullScreen) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Exit full screen preview"
                onClick={handleExitFullScreen}
                className="h-7 shrink-0 text-xs"
              >
                <Minimize2 className="mr-1 h-3.5 w-3.5" />
                Exit full screen
              </Button>
            ) : (
              allowFullScreen &&
              hasFileUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Open full screen preview"
                  onClick={() => void handleEnterFullScreen()}
                  className="h-7 shrink-0 text-xs"
                >
                  <Maximize2 className="mr-1 h-3.5 w-3.5" />
                  Full screen
                </Button>
              )
            )}

            {hasFileUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 shrink-0 text-xs"
              >
                <a
                  href={activeFile.fileUrl}
                  download={activeFile.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download original
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Preview Body */}
        <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden">
          {!hasFileUrl ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="m-0 text-sm">File URL is unavailable.</p>
            </div>
          ) : kind === 'pdf' ? (
            <Suspense fallback={<Skeleton className="m-4 h-[60vh]" />}>
              <PdfViewer
                url={activeFile.fileUrl}
                title={activeFile.fileName}
                renderPageOverlay={renderPdfPageOverlay}
              />
            </Suspense>
          ) : kind === 'docx' ? (
            <Suspense fallback={<Skeleton className="m-4 h-[60vh]" />}>
              <DocxViewer url={activeFile.fileUrl} title={activeFile.fileName} />
            </Suspense>
          ) : kind === 'spreadsheet' ? (
            <Suspense fallback={<Skeleton className="m-4 h-[60vh]" />}>
              <SpreadsheetViewer
                url={activeFile.fileUrl}
                title={activeFile.fileName}
              />
            </Suspense>
          ) : kind === 'presentation' ? (
            <Suspense fallback={<Skeleton className="m-4 h-[60vh]" />}>
              <PresentationViewer
                url={activeFile.fileUrl}
                title={activeFile.fileName}
              />
            </Suspense>
          ) : kind === 'image' ? (
            <ImageViewer url={activeFile.fileUrl} title={activeFile.fileName} />
          ) : kind === 'text' ? (
            <TextViewer url={activeFile.fileUrl} title={activeFile.fileName} />
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="m-0 text-sm font-semibold">
                  Preview is not supported for this file format
                </p>
                <p className="m-0 text-xs text-muted-foreground">
                  Please download {activeFile.fileName} to open it locally.
                </p>
              </div>
              <Button asChild size="sm">
                <a
                  href={activeFile.fileUrl}
                  download={activeFile.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download {activeFile.fileName}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {fullScreenOpen && !isFullScreen && (
        <FullScreenPreviewDialog
          files={files}
          activeIndex={safeIndex}
          onActiveIndexChange={handleSelectIndex}
          renderPdfPageOverlay={renderPdfPageOverlay}
          onClose={() => setFullScreenOpen(false)}
        />
      )}
    </>
  );
};

