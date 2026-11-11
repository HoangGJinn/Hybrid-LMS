import { cn } from '@shared/utils/cn';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Width of the dialog; `lg` suits tables and previews, `xl` suits two-column builders. */
  size?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

/** Accessible modal built on the native <dialog>: focus trap, Esc to close and backdrop come from the browser. */
export const Modal = ({ open, title, onClose, size = 'md', children }: ModalProps) => {
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
        SIZE_CLASS[size],
      )}
    >
      <div className="p-6">
        <h2 className="mb-4 mt-0 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
};
