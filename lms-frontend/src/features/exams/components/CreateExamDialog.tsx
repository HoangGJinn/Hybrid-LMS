import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  Circle,
  FileUp,
  ListChecks,
  Lock,
  Paperclip,
  PencilLine,
  X,
} from 'lucide-react';
import { EXAM_ACCEPT, validateExamFile } from '@features/documents';
import { DateTimeField, toLocalInputValue } from '@features/assignments';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import type {
  ExamFileLink,
  ExamFormat,
  LecturerExam,
  NewExamInput,
} from '../types/exams.types';
import {
  createEmptyQuestion,
  EXAM_NAME_MAX_LENGTH,
  hasExamFormErrors,
  isQuestionComplete,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  toDraftQuestions,
  toNewExamInput,
  validateExamForm,
  type ExamFormErrors,
  type ExamQuestionDraft,
} from '../utils/exam-form';
import { ExamQuestionsEditor } from './ExamQuestionsEditor';
import { ImportQuestionsPanel } from './ImportQuestionsPanel';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_MINUTES = '60';

interface CreateExamDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  /** When given, the dialog edits this exam instead of creating a new one. Mount it fresh per exam. */
  exam?: LecturerExam;
  /** `keptFileId` is the existing question file left in place; always `null` when creating or replaced. */
  onSubmit: (input: NewExamInput, keptFileId: string | null) => void;
}

const toDate = (iso: string | undefined, fallback: () => Date): Date => {
  const date = iso ? new Date(iso) : fallback();
  return Number.isNaN(date.getTime()) ? fallback() : date;
};

const lockNotice = (exam: LecturerExam): string => {
  if (exam.status === 'CLOSED') {
    return 'This exam is closed; only its name can be changed.';
  }
  if (exam.startedCount > 0) {
    const students =
      exam.startedCount === 1
        ? '1 student has'
        : `${exam.startedCount} students have`;
    return `${students} started; questions and answers are locked. Closing time and duration can only be extended.`;
  }
  return 'This exam has opened; questions and answers are locked. Closing time and duration can only be extended.';
};

/**
 * UC-31: the lecturer enters the exam's name, when it opens and closes, how long one attempt lasts, and either
 * typed multiple-choice questions or a question file. With `exam` it becomes the edit form, prefilled and locked
 * according to the exam's status and started sessions.
 */
export const CreateExamDialog = ({
  open,
  isSubmitting,
  onClose,
  exam,
  onSubmit,
}: CreateExamDialogProps) => {
  const isEdit = exam !== undefined;
  const isContentLocked = exam?.isContentLocked ?? false;
  const isClosed = exam?.status === 'CLOSED';
  const fileInput = useRef<HTMLInputElement>(null);
  const [examName, setExamName] = useState(exam?.examName ?? '');
  const [startTime, setStartTime] = useState(() =>
    toLocalInputValue(toDate(exam?.startTime, () => new Date())),
  );
  const [endTime, setEndTime] = useState(() =>
    toLocalInputValue(
      toDate(exam?.endTime, () => new Date(Date.now() + DAY_MS)),
    ),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    exam ? String(exam.durationMinutes) : DEFAULT_DURATION_MINUTES,
  );
  const [format, setFormat] = useState<ExamFormat>(
    exam?.format ?? 'MULTIPLE_CHOICE',
  );
  const [questions, setQuestions] = useState<ExamQuestionDraft[]>(() =>
    exam ? toDraftQuestions(exam.questions) : [createEmptyQuestion()],
  );
  const [file, setFile] = useState<File | null>(null);
  /** The question file already on the exam that the lecturer has not removed or replaced. */
  const [keptFile, setKeptFile] = useState<ExamFileLink | null>(
    exam?.file ?? null,
  );
  const [errors, setErrors] = useState<ExamFormErrors>({ questionErrors: {} });
  /** `null` keeps the Question Builder closed; a number opens it focused on that question index. */
  const [builderStartIndex, setBuilderStartIndex] = useState<number | null>(
    null,
  );

  const completeCount = questions.filter(isQuestionComplete).length;
  const incompleteCount = questions.length - completeCount;
  const firstIncompleteIndex = Math.max(
    questions.findIndex((question) => !isQuestionComplete(question)),
    0,
  );
  const errorQuestionIndices = Object.keys(errors.questionErrors).map(Number);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };
  const handleSubmit = () => {
    const values = {
      examName,
      startTime,
      endTime,
      durationMinutes,
      format,
      questions,
      file,
    };
    const editContext = exam
      ? { exam, hasKeptFile: keptFile !== null }
      : undefined;
    const found = validateExamForm(values, new Date(), editContext);
    setErrors(found);
    if (hasExamFormErrors(found)) return;
    onSubmit(
      toNewExamInput(values, editContext),
      file ? null : (keptFile?.fileId ?? null),
    );
  };
  const handlePickFile = (picked: File | undefined) => {
    if (!picked) return;
    const error = validateExamFile(picked);
    if (error) {
      setErrors((current) => ({ ...current, file: error }));
      return;
    }
    setFile(picked);
    setKeptFile(null);
    setErrors((current) => ({ ...current, file: undefined }));
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit exam' : 'Create exam'}
      size="lg"
      onClose={handleClose}
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {exam && isContentLocked && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
          >
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{lockNotice(exam)}</span>
          </div>
        )}
        <Section title="Basic information">
          <div>
            <Input
              aria-label="Exam name"
              placeholder="Exam name"
              maxLength={EXAM_NAME_MAX_LENGTH}
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
            {errors.examName && <FieldError message={errors.examName} />}
          </div>
        </Section>

        <Section title="Schedule">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField
              label="Opens"
              value={startTime}
              onChange={setStartTime}
              error={errors.startTime}
              disabled={isContentLocked}
            />
            <DateTimeField
              label="Closes"
              value={endTime}
              onChange={setEndTime}
              error={errors.endTime}
              disabled={isClosed}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="exam-duration" className="text-muted-foreground">
              Time allowed per student (minutes)
            </label>
            <Input
              id="exam-duration"
              type="number"
              inputMode="numeric"
              min={MIN_DURATION_MINUTES}
              max={MAX_DURATION_MINUTES}
              disabled={isClosed}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="max-w-40"
            />
            <p className="m-0 text-xs text-muted-foreground">
              Students can start any time between opening and closing. A
              student who starts late is cut off when the exam closes.
            </p>
            {errors.durationMinutes && (
              <FieldError message={errors.durationMinutes} />
            )}
          </div>
        </Section>

        {!isContentLocked && (
          <Section title="Exam content">
            <div className="grid gap-3 sm:grid-cols-2">
              <TypeCard
                active={format === 'MULTIPLE_CHOICE'}
                icon={<ListChecks className="h-5 w-5" />}
                title="Multiple choice"
                hint="Type the questions; 2–6 answers each, one correct"
                onClick={() => setFormat('MULTIPLE_CHOICE')}
              />
              <TypeCard
                active={format === 'FILE'}
                icon={<FileUp className="h-5 w-5" />}
                title="Question file"
                hint="Upload the exam as a PDF, DOC or DOCX"
                onClick={() => setFormat('FILE')}
              />
            </div>
            {format === 'MULTIPLE_CHOICE' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3.5">
                  <div className="space-y-1">
                    <p className="m-0 text-sm font-medium">
                      {questions.length}{' '}
                      {questions.length === 1 ? 'question' : 'questions'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {completeCount} complete
                      </span>
                      {incompleteCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Circle className="h-3.5 w-3.5" />
                          {incompleteCount} incomplete
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBuilderStartIndex(firstIncompleteIndex)}
                  >
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Open question builder
                  </Button>
                </div>
                <ImportQuestionsPanel
                  questions={questions}
                  onChange={setQuestions}
                />
                {errors.questions && <FieldError message={errors.questions} />}
                {errorQuestionIndices.length > 0 && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  >
                    <span>
                      {errorQuestionIndices.length}{' '}
                      {errorQuestionIndices.length === 1
                        ? 'question is'
                        : 'questions are'}{' '}
                      incomplete or invalid (first: Question{' '}
                      {errorQuestionIndices[0] + 1}).
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setBuilderStartIndex(errorQuestionIndices[0])
                      }
                    >
                      Fix Question {errorQuestionIndices[0] + 1}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  aria-label="Question file"
                  accept={EXAM_ACCEPT}
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    // Clear the input so choosing the same file again still fires onChange.
                    e.target.value = '';
                    handlePickFile(picked);
                  }}
                />
                {file ? (
                  <PickedFileRow
                    name={file.name}
                    onRemove={() => setFile(null)}
                  />
                ) : keptFile ? (
                  <PickedFileRow
                    name={keptFile.fileName}
                    onRemove={() => setKeptFile(null)}
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                  >
                    <FileUp className="mr-1 h-3 w-3" />
                    Choose file
                  </Button>
                )}
                {errors.file && <FieldError message={errors.file} />}
              </div>
            )}
          </Section>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" disabled={isSubmitting} onClick={handleClose}>
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting
            ? isEdit
              ? 'Saving…'
              : 'Creating…'
            : isEdit
              ? 'Save changes'
              : 'Create exam'}
        </Button>
      </div>
      {builderStartIndex !== null && (
        <ExamQuestionsEditor
          open
          questions={questions}
          errors={errors.questionErrors}
          initialIndex={builderStartIndex}
          onChange={setQuestions}
          onClose={() => setBuilderStartIndex(null)}
        />
      )}
    </Modal>
  );
};

const PickedFileRow = ({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) => (
  <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
    <span className="flex items-center gap-2">
      <Paperclip className="h-4 w-4" />
      {name}
    </span>
    <button
      type="button"
      aria-label={`Remove ${name}`}
      onClick={onRemove}
      className="border-0 bg-transparent"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

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
