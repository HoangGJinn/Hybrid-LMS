import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { toast } from 'sonner';
import { FileUp, X } from 'lucide-react';
import { acceptForFormats, validateAssignmentFile } from '@features/documents';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import type {
  AssignmentDetail,
  AssignmentFileLink,
  SubmissionInput,
} from '../types/assignments.types';
import { Chip } from './Chip';

interface SubmissionFormProps {
  assignment: AssignmentDetail;
  existingFiles: AssignmentFileLink[];
  initialText: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: SubmissionInput) => void;
}

/**
 * UC-16 / UC-17: a student hands in work. A file assignment shows a drop zone that only takes the formats the
 * lecturer allowed; an online assignment shows a text area instead.
 */
export const SubmissionForm = ({
  assignment,
  existingFiles,
  initialText,
  isSubmitting,
  onCancel,
  onSubmit,
}: SubmissionFormProps) => {
  const isText = assignment.submissionType === 'TEXT';
  const accepted = assignment.acceptedExtensions;
  const input = useRef<HTMLInputElement>(null);
  const [kept, setKept] = useState(existingFiles);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [text, setText] = useState(initialText);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const invalid = picked
      .map((file) => ({ file, error: validateAssignmentFile(file, accepted) }))
      .find((result) => result.error !== null);
    if (invalid) {
      toast.error(`${invalid.file.name}: ${invalid.error}`);
      return;
    }
    setNewFiles((current) => [...current, ...picked]);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const hasFiles = kept.length + newFiles.length > 0;
  const canSave = isText ? text.trim() !== '' : hasFiles;

  const save = () =>
    onSubmit(
      isText
        ? { keptFileIds: [], newFiles: [], answerText: text.trim() }
        : { keptFileIds: kept.map((x) => x.fileId), newFiles },
    );

  return (
    <div className="mt-4 rounded-lg border bg-card p-4">
      {isText ? (
        <textarea
          aria-label="Your answer"
          rows={12}
          maxLength={50000}
          placeholder="Type your answer here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border bg-background p-3 font-mono text-sm"
        />
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground',
              dragging && 'border-primary bg-primary/15',
            )}
          >
            <FileUp className="h-8 w-8" />
            Drag and drop files here, or click to browse
            {accepted.length > 0 && (
              <span className="flex flex-wrap justify-center gap-2">
                {accepted.map((format) => (
                  <Chip key={format}>.{format}</Chip>
                ))}
              </span>
            )}
            <input
              ref={input}
              type="file"
              multiple
              hidden
              aria-label="Submission files"
              accept={acceptForFormats(accepted)}
              onChange={(e) => {
                addFiles(e.target.files);
                // Clear the input so choosing the same file again still fires onChange.
                e.target.value = '';
              }}
            />
          </div>
          {hasFiles && (
            <ul className="mt-3 list-none space-y-1 p-0">
              {kept.map((file) => (
                <FormFileRow
                  key={file.fileId}
                  name={file.fileName}
                  onRemove={() =>
                    setKept((current) =>
                      current.filter((x) => x.fileId !== file.fileId),
                    )
                  }
                />
              ))}
              {newFiles.map((file, index) => (
                <FormFileRow
                  key={`${file.name}-${index}`}
                  name={file.name}
                  onRemove={() =>
                    setNewFiles((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
      <div className="mt-3 flex gap-2">
        <Button disabled={!canSave || isSubmitting} onClick={save}>
          {isSubmitting
            ? isText
              ? 'Saving…'
              : 'Uploading…'
            : 'Save submission'}
        </Button>
        <Button variant="outline" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

const FormFileRow = ({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) => (
  <li className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
    <span>{name}</span>
    <button
      type="button"
      aria-label={`Remove ${name}`}
      onClick={onRemove}
      className="border-0 bg-transparent"
    >
      <X className="h-4 w-4" />
    </button>
  </li>
);