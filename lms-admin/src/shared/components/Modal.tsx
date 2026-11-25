import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  headerActions?: ReactNode;
}

const sizeClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

/** Accessible modal built on the native <dialog>: focus trap, Esc to close and backdrop come from the browser. */
export const Modal = ({
  open,
  title,
  onClose,
  children,
  size = 'md',
  className,
  headerActions,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clicks on the ::backdrop target the <dialog> itself, clicks on content target a descendant.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50',
        sizeClasses[size],
        className,
      )}
    >
      <div className="p-6">
        {headerActions ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2>
            {headerActions}
          </div>
        ) : (
          <h2 className="mb-4 mt-0 text-lg font-semibold">{title}</h2>
        )}
        {children}
      </div>
    </dialog>
  );
};
