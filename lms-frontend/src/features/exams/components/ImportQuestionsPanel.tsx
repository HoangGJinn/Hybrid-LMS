import { useState } from 'react';
import { CsvFilePicker } from '@shared/components/CsvFilePicker';
import { readCsvFile } from '@shared/utils/csv';
import {
  EXAM_MAX_QUESTIONS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  type ExamQuestionDraft,
} from '../utils/exam-form';
import {
  isBlankQuestion,
  parseQuestionCsv,
  QUESTION_TEMPLATE_CSV,
} from '../utils/exam-csv';

const MAX_LISTED_ERRORS = 20;

interface ImportQuestionsPanelProps {
  /** The questions in the editor now; the file's questions are added after them. */
  questions: ExamQuestionDraft[];
  onChange: (questions: ExamQuestionDraft[]) => void;
}

/**
 * Fills the editor from a CSV file read in the browser (nothing is uploaded). If the file has any
 * problem nothing is added and every problem is listed, so the lecturer fixes the file and picks it again.
 */
export const ImportQuestionsPanel = ({
  questions,
  onChange,
}: ImportQuestionsPanelProps) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [added, setAdded] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    setErrors([]);
    setAdded(null);
    const read = await readCsvFile(file);
    if (read.error !== null) {
      setErrors([read.error]);
      return;
    }
    // The empty question a new dialog starts with is replaced rather than kept in front of the import.
    const kept = questions.filter((question) => !isBlankQuestion(question));
    const parsed = parseQuestionCsv(read.text, kept.length);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      return;
    }
    onChange([...kept, ...parsed.questions]);
    setAdded(parsed.questions.length);
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="m-0 text-xs text-muted-foreground">
        Or fill the questions from a CSV file (up to {EXAM_MAX_QUESTIONS}{' '}
        questions). Columns: Question, Option A to Option F, Correct. Each
        question needs {MIN_OPTIONS} to {MAX_OPTIONS} answers filled in order
        from A, and Correct is the letter of the one right answer. Questions
        from the file are added after the ones below. Excel users: save as “CSV
        UTF-8”.
      </p>
      <CsvFilePicker
        ariaLabel="Questions CSV file"
        templateCsv={QUESTION_TEMPLATE_CSV}
        templateFileName="exam-questions-template.csv"
        onPickFile={(file) => void handleFile(file)}
      />
      {added !== null && (
        <p role="status" className="m-0 text-xs text-success">
          Added {added} {added === 1 ? 'question' : 'questions'} from the file.
          Review them below, then create the exam.
        </p>
      )}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <p className="m-0 font-medium">
            Nothing was imported. Fix the file and choose it again:
          </p>
          <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4">
            {errors.slice(0, MAX_LISTED_ERRORS).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          {errors.length > MAX_LISTED_ERRORS && (
            <p className="m-0 mt-1">
              Showing the first {MAX_LISTED_ERRORS} of {errors.length} problems.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

