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
    title: 'Remove assignment?',
    consequence:
      'will be removed from this section. If students have already submitted, their work is kept; otherwise the assignment and its files are deleted from storage.',
    action: 'Remove assignment',
  },
  EXAM: {
    title: 'Remove exam?',
    consequence:
      'will be removed from this section, so students no longer see it. If students have already started it, their work is kept; otherwise the exam and its question file are deleted from storage.',
    action: 'Remove exam',
  },
};

const DOCUMENT_COPY: RemoveCopy = {
  title: 'Delete document?',
  consequence:
    'will be removed from this section and its file will be permanently deleted from storage. This cannot be undone.',
  action: 'Delete document',
};

/** UC-30 / UC-32 / UC-34 confirmation shown before a document, an exam or an assignment is removed. */
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
              {isRemoving ? 'Removing…' : copy.action}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
