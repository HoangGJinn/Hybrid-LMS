import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import type { SectionItem } from '../types/courses.types';

interface RemoveContentConfirmProps {
  /** The document or assignment to remove; `null` keeps the dialog closed. */
  item: SectionItem | null;
  isRemoving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const consequence = (item: SectionItem): string =>
  item.itemType === 'ASSIGNMENT'
    ? 'will be removed from this section. If students have already submitted, their work is kept; otherwise the assignment and its files are deleted from storage.'
    : 'will be removed from this section and its file will be permanently deleted from storage. This cannot be undone.';

/** UC-30 / UC-34 confirmation shown before a document or an assignment is removed. */
export const RemoveContentConfirm = ({
  item,
  isRemoving,
  onConfirm,
  onClose,
}: RemoveContentConfirmProps) => (
  <Modal
    open={item !== null}
    title={
      item?.itemType === 'ASSIGNMENT' ? 'Remove assignment?' : 'Delete document?'
    }
    onClose={onClose}
  >
    {item && (
      <div className="space-y-4">
        <p className="m-0 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{item.title}</span>{' '}
          {consequence(item)}
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
            {isRemoving
              ? 'Removing…'
              : item.itemType === 'ASSIGNMENT'
                ? 'Remove assignment'
                : 'Delete document'}
          </Button>
        </div>
      </div>
    )}
  </Modal>
);