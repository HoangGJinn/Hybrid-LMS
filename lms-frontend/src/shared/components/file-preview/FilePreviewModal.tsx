import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { FilePreviewPanel } from './FilePreviewPanel';
import type { PdfPageOverlayRenderer, PreviewableFile } from './types';
import { useElementFullscreen } from './useElementFullscreen';

interface FilePreviewModalProps {
  open: boolean;
  files: PreviewableFile[];
  initialIndex?: number;
  title?: string;
  renderPdfPageOverlay?: PdfPageOverlayRenderer;
  defaultFullScreen?: boolean;
  onClose: () => void;
}

export const FilePreviewModal = (props: FilePreviewModalProps) => {
  if (!props.open) return null;
  return (
    <FilePreviewModalInner
      key={`${props.initialIndex ?? 0}-${props.files.map((f) => f.fileName).join(',')}`}
      {...props}
    />
  );
};

const FilePreviewModalInner = ({
  open,
  files,
  initialIndex = 0,
  title = 'File Preview',
  renderPdfPageOverlay,
  defaultFullScreen = false,
  onClose,
}: FilePreviewModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isExpanded, setIsExpanded] = useState(defaultFullScreen);
  const { isNativeFullscreen, enterFullscreen, exitFullscreen } =
    useElementFullscreen(contentRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
      if (defaultFullScreen) {
        void enterFullscreen();
      }
    }
    if (!open && dialog.open && typeof dialog.close === 'function') {
      void exitFullscreen();
      dialog.close();
    }
  }, [open, defaultFullScreen, enterFullscreen, exitFullscreen]);

  const handleToggleFullScreen = async () => {
    if (isNativeFullscreen || isExpanded) {
      if (isNativeFullscreen) await exitFullscreen();
      setIsExpanded(false);
      return;
    }
    const enteredNative = await enterFullscreen();
    if (!enteredNative) {
      setIsExpanded(true);
    }
  };

  const handleCloseModal = () => {
    if (isNativeFullscreen) {
      void exitFullscreen();
    }
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) handleCloseModal();
  };

  const showingFullScreen = isNativeFullscreen || isExpanded;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(event) => {
        if (document.fullscreenElement) {
          event.preventDefault();
        }
      }}
      onClose={handleCloseModal}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60',
        isNativeFullscreen
          ? 'h-screen w-screen max-w-none rounded-none border-0'
          : isExpanded
            ? 'h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none rounded-xl'
            : 'h-[88vh] w-[calc(100vw-2rem)] max-w-6xl rounded-2xl',
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          'flex h-full flex-col bg-card text-card-foreground',
          isNativeFullscreen && 'h-screen w-screen',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="m-0 truncate text-base font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={
                showingFullScreen
                  ? 'Exit full screen modal'
                  : 'Expand modal to full screen'
              }
              onClick={() => void handleToggleFullScreen()}
            >
              {showingFullScreen ? (
                <>
                  <Minimize2 className="mr-1 h-3.5 w-3.5" />
                  Exit full screen
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1 h-3.5 w-3.5" />
                  Full screen
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close preview"
              onClick={handleCloseModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <FilePreviewPanel
            files={files}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            renderPdfPageOverlay={renderPdfPageOverlay}
            allowFullScreen={false}
          />
        </div>
      </div>
    </dialog>
  );
};
