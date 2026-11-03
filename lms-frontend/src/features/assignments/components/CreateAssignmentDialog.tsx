import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FileUp, Paperclip, PencilLine, Plus, X } from 'lucide-react';
import { ASSIGNMENT_ACCEPT, SUBMISSION_FORMATS } from '@features/documents';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import type {
  NewAssignmentInput,
  SubmissionType,
} from '../types/assignments.types';
import {
  toLocalInputValue,
  validateAssignmentForm,
  type AssignmentFormErrors,
} from '../utils/assignment-form';
import { DateTimeField } from './DateTimeField';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_MS = 7 * DAY_MS;

/** Shortcuts that set the due date relative to the opening time. */
const DUE_PRESETS = [
  { label: '+1 day', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
] as const;

interface CreateAssignmentDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: NewAssignmentInput) => void;
}

/** UC-33: the lecturer enters the brief, the schedule, how students submit and optional attachments. */
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
  const [submissionType, setSubmissionType] = useState<SubmissionType>('FILE');
  const [formats, setFormats] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<AssignmentFormErrors>({});

  const reset = () => {
    setTitle('');
    setInstruction('');
    setOpenAt(toLocalInputValue(new Date()));
    setEndAt(toLocalInputValue(new Date(Date.now() + DEFAULT_DURATION_MS)));
    setSubmissionType('FILE');
    setFormats([]);
    setNote('');
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
      submissionType,
      acceptedExtensions: submissionType === 'FILE' ? formats : [],
      submissionNote: note.trim(),
      files,
    });
  };
  const toggleFormat = (format: string) =>
    setFormats((current) =>
      current.includes(format)
        ? current.filter((x) => x !== format)
        : [...current, format],
    );
  const setDueIn = (days: number) => {
    const start = new Date(openAt);
    const base = Number.isNaN(start.getTime()) ? new Date() : start;
    setEndAt(toLocalInputValue(new Date(base.getTime() + days * DAY_MS)));
  };

  return (
    <Modal
      open={open}
      title="Create assignment"
      size="lg"
      onClose={handleClose}
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Section title="Basic information">
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
              placeholder="Describe the task for students…"
              rows={5}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full rounded-md border bg-background p-3 text-sm"
            />
            {errors.instruction && <FieldError message={errors.instruction} />}
          </div>
        </Section>

        <Section title="Schedule">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField
              label="Opens"
              value={openAt}
              onChange={setOpenAt}
              error={errors.openAt}
            />
            <DateTimeField
              label="Due"
              value={endAt}
              onChange={setEndAt}
              error={errors.endAt}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Due after opening:</span>
            {DUE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDueIn(preset.days)}
                className="rounded-full border bg-card px-2.5 py-0.5 hover:border-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="How students submit">
          <div className="grid gap-3 sm:grid-cols-2">
            <TypeCard
              active={submissionType === 'FILE'}
              icon={<FileUp className="h-5 w-5" />}
              title="Upload files"
              hint="Code, zip, slides, documents…"
              onClick={() => setSubmissionType('FILE')}
            />
            <TypeCard
              active={submissionType === 'TEXT'}
              icon={<PencilLine className="h-5 w-5" />}
              title="Write online"
              hint="Students type the answer directly"
              onClick={() => setSubmissionType('TEXT')}
            />
          </div>
          {submissionType === 'FILE' && (
            <div>
              <p className="m-0 mb-2 text-xs text-muted-foreground">
                Accepted file types (leave empty to accept every supported type)
              </p>
              <div className="flex flex-wrap gap-2">
                {SUBMISSION_FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    aria-pressed={formats.includes(format)}
                    onClick={() => toggleFormat(format)}
                    className={cn(
                      'rounded-full border px-3 py-1 font-mono text-xs',
                      formats.includes(format)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card',
                    )}
                  >
                    .{format}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            aria-label="Submission note"
            placeholder="Note for students, e.g. “Submit one .zip with main.cpp and README.txt”"
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
        </Section>

        <Section title="Attachments (optional)">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            aria-label="Attachments"
            accept={ASSIGNMENT_ACCEPT}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              // Clear the input so choosing the same file again still fires onChange.
              e.target.value = '';
              setFiles((current) => [...current, ...picked]);
            }}
          />
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <Plus className="mr-1 h-3 w-3" />
              Attach files
            </Button>
          </div>
          {files.length > 0 && (
            <ul className="m-0 list-none space-y-1 p-0">
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
        </Section>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" disabled={isSubmitting} onClick={handleClose}>
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Creating…' : 'Create assignment'}
        </Button>
      </div>
    </Modal>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <fieldset className="m-0 min-w-0 space-y-3 rounded-lg border p-4">
    <legend className="px-1 text-sm font-semibold">{title}</legend>
    {children}
  </fieldset>
);

interface TypeCardProps {
  active: boolean;
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}

const TypeCard = ({ active, icon, title, hint, onClick }: TypeCardProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'flex items-start gap-3 rounded-lg border p-3 text-left',
      active ? 'border-primary bg-primary/10' : 'bg-card hover:border-primary/50',
    )}
  >
    {icon}
    <span>
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </span>
  </button>
);

const FieldError = ({ message }: { message: string }) => (
  <p role="alert" className="m-0 mt-1 text-xs text-destructive">
    {message}
  </p>
);