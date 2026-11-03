import { useRef, useState } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { DOCUMENT_ACCEPT } from '@features/documents';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import type { NewAssignmentInput } from '../types/assignments.types';
import {
  toLocalInputValue,
  validateAssignmentForm,
  type AssignmentFormErrors,
} from '../utils/assignment-form';

const DEFAULT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateAssignmentDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: NewAssignmentInput) => void;
}

/** UC-33: the lecturer enters the brief, the schedule and optional attachments of a new assignment. */
export const CreateAssignmentDialog = ({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateAssignmentDialogProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [openAt, setOpenAt] = useState(() => toLocalInputValue(new Date()));
  const [endAt, setEndAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + DEFAULT_DURATION_MS)),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<AssignmentFormErrors>({});

  const reset = () => {
    setTitle('');
    setInstruction('');
    setOpenAt(toLocalInputValue(new Date()));
    setEndAt(toLocalInputValue(new Date(Date.now() + DEFAULT_DURATION_MS)));
    setFiles([]);
    setErrors({});
  };
  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };
  const handleSubmit = () => {
    const found = validateAssignmentForm({
      title,
      instruction,
      openAt,
      endAt,
      files,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      title: title.trim(),
      instruction: instruction.trim(),
      openAt: new Date(openAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      files,
    });
  };

  return (
    <Modal open={open} title="Create assignment" onClose={handleClose}>
      <div className="space-y-3">
        <div>
          <Input
            aria-label="Assignment title"
            placeholder="Title"
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <FieldError message={errors.title} />}
        </div>
        <div>
          <textarea
            aria-label="Assignment brief"
            placeholder="Brief / note for students"
            rows={5}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
          {errors.instruction && <FieldError message={errors.instruction} />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Opens</span>
            <Input
              type="datetime-local"
              aria-label="Opens at"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
            />
            {errors.openAt && <FieldError message={errors.openAt} />}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Due</span>
            <Input
              type="datetime-local"
              aria-label="Due at"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
            {errors.endAt && <FieldError message={errors.endAt} />}
          </label>
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            aria-label="Attachments"
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              // Clear the input so choosing the same file again still fires onChange.
              e.target.value = '';
              setFiles((current) => [...current, ...picked]);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInput.current?.click()}
          >
            <Plus className="mr-1 h-3 w-3" />
            Attach files
          </Button>
          {files.length > 0 && (
            <ul className="mt-2 list-none space-y-1 p-0">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    {file.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className="border-0 bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.files && <FieldError message={errors.files} />}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Creating…' : 'Create assignment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const FieldError = ({ message }: { message: string }) => (
  <p role="alert" className="m-0 mt-1 text-xs text-destructive">
    {message}
  </p>
);