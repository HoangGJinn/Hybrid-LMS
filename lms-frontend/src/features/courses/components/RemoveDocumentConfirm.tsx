import { Modal } from '@shared/components/Modal'
import { Button } from '@shared/components/ui/button'
import type { SectionItem } from '../types/courses.types'

interface RemoveDocumentConfirmProps {
  /** The document item to remove; `null` keeps the dialog closed. */
  item: SectionItem | null
  onConfirm: () => void
  onClose: () => void
}

/** UC-30 confirmation: removing hides the document from the section; the stored file is kept. */
export const RemoveDocumentConfirm = ({
  item,
  onConfirm,
  onClose,
}: RemoveDocumentConfirmProps) => (
  <Modal open={item !== null} title="Remove document?" onClose={onClose}>
    {item && (
      <div className="space-y-4">
        <p className="m-0 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{item.title}</span> will
          be removed from this section and hidden from students once you save
          your changes.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Remove document
          </Button>
        </div>
      </div>
    )}
  </Modal>
)
