import { validateAssignmentFile } from '@features/documents';

export interface AssignmentFormValues {
  title: string;
  instruction: string;
  /** Value of an `<input type="datetime-local">`, for example `2026-10-01T08:00`. */
  openAt: string;
  endAt: string;
  files: File[];
  /** Attachments of an assignment being edited that stay; they count toward the limit. */
  keptFileCount?: number;
}

export type AssignmentFormErrors = Partial<
  Record<'title' | 'instruction' | 'openAt' | 'endAt' | 'files', string>
>;

const MAX_ATTACHMENTS = 10;

/** Pads a number to two digits. */
const two = (n: number) => String(n).padStart(2, '0');

/** Formats a date as the local value an `<input type="datetime-local">` expects. */
export const toLocalInputValue = (date: Date): string =>
  `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;

/** UC-33 exception flow: missing brief or an impossible schedule is reported before anything is sent. */
export const validateAssignmentForm = (
  values: AssignmentFormValues,
): AssignmentFormErrors => {
  const errors: AssignmentFormErrors = {};
  if (values.title.trim() === '') errors.title = 'Enter a title';
  if (values.instruction.trim() === '')
    errors.instruction = 'Enter the assignment brief';

  const openAt = new Date(values.openAt).getTime();
  const endAt = new Date(values.endAt).getTime();
  if (Number.isNaN(openAt)) errors.openAt = 'Choose an opening time';
  if (Number.isNaN(endAt)) errors.endAt = 'Choose a due time';
  if (!errors.openAt && !errors.endAt && endAt <= openAt)
    errors.endAt = 'The due time must be after the opening time';
  if (values.files.length + (values.keptFileCount ?? 0) > MAX_ATTACHMENTS)
    errors.files = `Attach at most ${MAX_ATTACHMENTS} files`;
  const invalidFile = values.files
    .map((file) => ({ file, error: validateAssignmentFile(file) }))
    .find((result) => result.error !== null);
  if (invalidFile && !errors.files)
    errors.files = `${invalidFile.file.name}: ${invalidFile.error}`;
  return errors;
};