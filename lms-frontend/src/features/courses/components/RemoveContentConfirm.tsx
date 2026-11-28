import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import type { ItemType, SectionItem } from '../types/courses.types';

interface RemoveContentConfirmProps {
  /** The document, assignment or exam to remove; `null` keeps the dialog closed. */
  item: SectionItem | null;
  isRemoving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

interface RemoveCopy {
  title: string;
  consequence: string;
  action: string;
}

const COPY: Partial<Record<ItemType, RemoveCopy>> = {
  ASSIGNMENT: {
    title: 'Delete assignment?',
    consequence:
      'will be deleted from this course and disappear for students. An assignment that students have already submitted to cannot be deleted; hide it instead.',
    action: 'Delete assignment',
  },
  EXAM: {
    title: 'Delete exam?',
    consequence:
      'will be deleted from this section, so students no longer see it. If you only want to pause it, hide it instead.',
    action: 'Delete exam',
  },
};

const DOCUMENT_COPY: RemoveCopy = {
  title: 'Delete document?',
  consequence:
    'will be deleted from this section and disappear for students. If you only want to pause it, hide it instead.',
  action: 'Delete document',
};


/** UC-30 / UC-32 / UC-34 confirmation shown before a document, an exam or an assignment is deleted. */
export const RemoveContentConfirm = ({
  item,
  isRemoving,
  onConfirm,
  onClose,
}: RemoveContentConfirmProps) => {
  const copy = (item && COPY[item.itemType]) ?? DOCUMENT_COPY;
  return (
    <Modal open={item !== null} title={copy.title} onClose={onClose}>
      {item && (
        <div className="space-y-4">
          <p className="m-0 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{item.title}</span>{' '}
            {copy.consequence}
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
              {isRemoving ? 'Deleting…' : copy.action}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};