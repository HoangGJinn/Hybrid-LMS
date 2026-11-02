import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import type { SectionItem } from '../types/courses.types';

interface RemoveDocumentConfirmProps {
  /** The document item to remove; `null` keeps the dialog closed. */
  item: SectionItem | null;
  isRemoving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** UC-30 confirmation: removing deletes the document and its stored file for good. */
export const RemoveDocumentConfirm = ({
  item,
  isRemoving,
  onConfirm,
  onClose,
}: RemoveDocumentConfirmProps) => (
  <Modal open={item !== null} title="Delete document?" onClose={onClose}>
    {item && (
      <div className="space-y-4">
        <p className="m-0 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{item.title}</span>{' '}
          will be removed from this section and its file will be permanently
          deleted from storage. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={isRemoving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isRemoving}
            onClick={onConfirm}
          >
            {isRemoving ? 'Deleting…' : 'Delete document'}
          </Button>
        </div>
      </div>
    )}
  </Modal>
);